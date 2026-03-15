import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export type IntegrationAppName = 'opencode' | 'claude' | 'cursor' | 'custom';

export interface WriteConfigPayload {
  appName: IntegrationAppName;
  config: Record<string, unknown>;
  autoBackup?: boolean;
  customPath?: string;
  backupDirectory?: string;
}

export interface ConfigResult {
  path: string;
  config: Record<string, unknown>;
}

export interface WriteConfigResult extends ConfigResult {
  backupPath?: string;
}

const expandHome = (value: string): string => {
  if (!value) {
    return value;
  }

  if (value.startsWith('~/')) {
    return path.join(os.homedir(), value.slice(2));
  }

  return value;
};

const resolveCursorPath = (): string => {
  const home = os.homedir();

  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json');
  }

  if (process.platform === 'win32') {
    return path.join(home, 'AppData', 'Roaming', 'Cursor', 'User', 'settings.json');
  }

  return path.join(home, '.config', 'Cursor', 'User', 'settings.json');
};

export const resolveConfigPath = (appName: IntegrationAppName, customPath?: string): string => {
  const home = os.homedir();

  switch (appName) {
    case 'opencode':
      return path.join(home, '.config', 'opencode', 'config.json');
    case 'claude':
      return path.join(home, '.claude', 'settings.json');
    case 'cursor':
      return resolveCursorPath();
    case 'custom':
      if (!customPath) {
        throw new Error('Custom integration requires a config path.');
      }
      return path.resolve(expandHome(customPath));
    default:
      throw new Error(`Unsupported app integration: ${appName}`);
  }
};

const ensureDir = async (directoryPath: string): Promise<void> => {
  await fs.mkdir(directoryPath, { recursive: true });
};

const loadJsonIfExists = async (filePath: string): Promise<Record<string, unknown>> => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }

    throw error;
  }
};

const sanitizeExistingConfigByApp = (
  appName: IntegrationAppName,
  config: Record<string, unknown>,
): Record<string, unknown> => {
  if (appName !== 'opencode') {
    return config;
  }

  const sanitized = { ...config };
  delete sanitized.opencode;
  delete sanitized.ollamaFlow;
  return sanitized;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  isPlainObject(value) ? value : undefined;

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/g, '');

const normalizeOllamaV1BaseUrl = (value: string): string => {
  const normalized = trimTrailingSlashes(value.trim());
  if (!normalized) {
    return 'http://127.0.0.1:11434/v1';
  }

  if (normalized.endsWith('/v1')) {
    return normalized;
  }

  return `${normalized}/v1`;
};

const extractOllamaBaseUrlFromConfig = (config: Record<string, unknown>): string => {
  const provider = asRecord(config.provider);
  const ollama = asRecord(provider?.ollama);
  const options = asRecord(ollama?.options);
  const raw = options?.baseURL;

  return typeof raw === 'string'
    ? normalizeOllamaV1BaseUrl(raw)
    : 'http://127.0.0.1:11434/v1';
};

const fetchJson = async (url: string): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const fetchOllamaModelIds = async (v1BaseUrl: string): Promise<string[]> => {
  const normalizedV1Base = normalizeOllamaV1BaseUrl(v1BaseUrl);
  const rootBase = normalizedV1Base.endsWith('/v1')
    ? normalizedV1Base.slice(0, -3)
    : normalizedV1Base;

  try {
    const payload = (await fetchJson(`${normalizedV1Base}/models`)) as {
      data?: Array<{ id?: string }>;
    };
    const ids = (payload.data ?? []).map((entry) => entry.id).filter((id): id is string => Boolean(id));

    if (ids.length > 0) {
      return ids.sort((left, right) => left.localeCompare(right));
    }
  } catch {
    // Fallback to /api/tags below.
  }

  try {
    const payload = (await fetchJson(`${rootBase}/api/tags`)) as {
      models?: Array<{ name?: string }>;
    };
    const ids = (payload.models ?? [])
      .map((entry) => entry.name)
      .filter((name): name is string => Boolean(name));

    return ids.sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
};

const buildOpencodeRegistryConfig = (
  existingConfig: Record<string, unknown>,
  v1BaseUrl: string,
  modelIds: string[],
): Record<string, unknown> => {
  const provider = asRecord(existingConfig.provider) ?? {};
  const ollamaProvider = asRecord(provider.ollama) ?? {};
  const existingModels = asRecord(ollamaProvider.models) ?? {};

  const nextModels: Record<string, { _launch: boolean; name: string }> = {};

  for (const modelId of modelIds) {
    const existingEntry = asRecord(existingModels[modelId]);
    const launch =
      existingEntry && typeof existingEntry._launch === 'boolean' ? existingEntry._launch : true;

    nextModels[modelId] = {
      _launch: launch,
      name: modelId,
    };
  }

  return {
    ...existingConfig,
    $schema: 'https://opencode.ai/config.json',
    provider: {
      ...provider,
      ollama: {
        ...ollamaProvider,
        name: typeof ollamaProvider.name === 'string' ? ollamaProvider.name : 'Ollama',
        npm: typeof ollamaProvider.npm === 'string' ? ollamaProvider.npm : '@ai-sdk/openai-compatible',
        options: {
          ...(asRecord(ollamaProvider.options) ?? {}),
          baseURL: v1BaseUrl,
        },
        models: nextModels,
      },
    },
  };
};

const syncOpencodeModelRegistry = async (
  configFilePath: string,
  mergedConfig: Record<string, unknown>,
  autoBackup: boolean,
  backupDirectory?: string,
): Promise<void> => {
  const v1BaseUrl = extractOllamaBaseUrlFromConfig(mergedConfig);
  const modelIds = await fetchOllamaModelIds(v1BaseUrl);

  if (modelIds.length === 0) {
    return;
  }

  const registryPath = path.join(path.dirname(configFilePath), 'opencode.json');
  const existingRegistry = await loadJsonIfExists(registryPath);
  const nextRegistry = buildOpencodeRegistryConfig(existingRegistry, v1BaseUrl, modelIds);

  if (autoBackup) {
    await createBackup(registryPath, backupDirectory);
  }

  await fs.writeFile(registryPath, JSON.stringify(nextRegistry, null, 2), 'utf-8');
};

const mergeObjects = (
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...existing };

  for (const [key, incomingValue] of Object.entries(incoming)) {
    const existingValue = merged[key];

    if (isPlainObject(existingValue) && isPlainObject(incomingValue)) {
      merged[key] = mergeObjects(existingValue, incomingValue);
      continue;
    }

    merged[key] = incomingValue;
  }

  return merged;
};

const backupTimestamp = (): string =>
  new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '').replace('T', '_');

const createBackup = async (
  sourceFilePath: string,
  backupDirectory?: string,
): Promise<string | undefined> => {
  try {
    await fs.access(sourceFilePath);
  } catch {
    return undefined;
  }

  const fileName = path.basename(sourceFilePath);
  const targetDirectory = backupDirectory
    ? path.resolve(expandHome(backupDirectory))
    : path.dirname(sourceFilePath);

  await ensureDir(targetDirectory);

  const destination = path.join(targetDirectory, `${fileName}.backup.${backupTimestamp()}`);
  await fs.copyFile(sourceFilePath, destination);
  return destination;
};

export const readConfigFile = async (
  appName: IntegrationAppName,
  customPath?: string,
): Promise<ConfigResult> => {
  const resolvedPath = resolveConfigPath(appName, customPath);
  const config = await loadJsonIfExists(resolvedPath);

  return {
    path: resolvedPath,
    config,
  };
};

export const writeConfigFile = async ({
  appName,
  config,
  autoBackup = true,
  customPath,
  backupDirectory,
}: WriteConfigPayload): Promise<WriteConfigResult> => {
  const resolvedPath = resolveConfigPath(appName, customPath);
  const dirPath = path.dirname(resolvedPath);

  await ensureDir(dirPath);

  const existingConfig = sanitizeExistingConfigByApp(appName, await loadJsonIfExists(resolvedPath));
  const mergedConfig = mergeObjects(existingConfig, config);
  const backupPath = autoBackup ? await createBackup(resolvedPath, backupDirectory) : undefined;

  await fs.writeFile(resolvedPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');

  if (appName === 'opencode') {
    await syncOpencodeModelRegistry(resolvedPath, mergedConfig, autoBackup, backupDirectory);
  }

  return {
    path: resolvedPath,
    config: mergedConfig,
    backupPath,
  };
};

export const restoreLatestBackup = async (
  appName: IntegrationAppName,
  customPath?: string,
  backupDirectory?: string,
): Promise<{ path: string; restoredFrom: string }> => {
  const resolvedPath = resolveConfigPath(appName, customPath);
  const fileName = path.basename(resolvedPath);

  const directory = backupDirectory
    ? path.resolve(expandHome(backupDirectory))
    : path.dirname(resolvedPath);

  const files = await fs.readdir(directory);

  const backups = files
    .filter((name) => name.startsWith(`${fileName}.backup.`))
    .sort((left, right) => right.localeCompare(left));

  if (backups.length === 0) {
    throw new Error('No backup file found for this integration.');
  }

  const latestBackupPath = path.join(directory, backups[0]);

  await ensureDir(path.dirname(resolvedPath));
  await fs.copyFile(latestBackupPath, resolvedPath);

  return {
    path: resolvedPath,
    restoredFrom: latestBackupPath,
  };
};
