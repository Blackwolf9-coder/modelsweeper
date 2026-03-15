import fs from 'node:fs/promises';
import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron';
import Store from 'electron-store';
import {
  IntegrationAppName,
  readConfigFile,
  restoreLatestBackup,
  writeConfigFile,
  resolveConfigPath,
} from './utils/configWriter';
import { getSystemRamSnapshot } from './utils/systemInfo';

type ThemePreference = 'light' | 'dark' | 'system';
type MultiModelMode = 'simultaneous' | 'sequential';

interface AppSettings {
  ollamaBaseUrl: string;
  backupDirectory: string;
  theme: ThemePreference;
  launchAtLogin: boolean;
}

interface CustomSlot {
  id: string;
  label: string;
  modelName: string;
}

interface Preset {
  id: string;
  name: string;
  thinker?: string;
  coder?: string;
  reviewer?: string;
  customSlots: CustomSlot[];
  mode: MultiModelMode;
  createdAt: string;
  updatedAt: string;
}

interface IntegrationEntry {
  enabled: boolean;
  autoBackup: boolean;
  customPath?: string;
  template?: string;
  lastAppliedAt?: string;
}

type IntegrationsState = Record<IntegrationAppName, IntegrationEntry>;

interface StoreSchema {
  settings: AppSettings;
  activePresetId: string | null;
  integrations: IntegrationsState;
}

let mainWindow: BrowserWindow | null = null;
let store: Store<StoreSchema> | null = null;

const createId = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const defaultPresets = (): Preset[] => {
  const now = new Date().toISOString();

  return [
    {
      id: createId('Daily Work'),
      name: 'Daily Work',
      thinker: 'thinker-14b-claude45',
      coder: 'coder-next-iq4nl',
      customSlots: [],
      mode: 'simultaneous',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId('Max Power'),
      name: 'Max Power',
      thinker: 'thinker-35b-claude46',
      coder: 'coder-next-iq3xxs',
      customSlots: [],
      mode: 'simultaneous',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId('Triple Check'),
      name: 'Triple Check',
      thinker: 'thinker-14b-claude45',
      coder: 'coder-next-iq4nl',
      reviewer: 'qwen35-35b-iq4nl',
      customSlots: [],
      mode: 'simultaneous',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId('Fast Mode'),
      name: 'Fast Mode',
      coder: 'coder-next-iq3xxs',
      customSlots: [],
      mode: 'sequential',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId('Deep Think'),
      name: 'Deep Think',
      thinker: 'qwen35-35b-q6xl',
      coder: 'coder-next-iq3xxs',
      customSlots: [],
      mode: 'simultaneous',
      createdAt: now,
      updatedAt: now,
    },
  ];
};

const defaultIntegrations = (): IntegrationsState => ({
  opencode: { enabled: true, autoBackup: true },
  claude: { enabled: true, autoBackup: true },
  cursor: { enabled: false, autoBackup: true },
  custom: { enabled: false, autoBackup: true, customPath: '', template: '{}' },
});

const getPresetsFilePath = (): string => path.join(app.getPath('userData'), 'presets.json');

const readPresetsFromDisk = async (): Promise<Preset[]> => {
  const filePath = getPresetsFilePath();

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Preset[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    const presets = defaultPresets();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(presets, null, 2), 'utf-8');
    return presets;
  }
};

const writePresetsToDisk = async (presets: Preset[]): Promise<void> => {
  const filePath = getPresetsFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(presets, null, 2), 'utf-8');
};

const getStore = (): Store<StoreSchema> => {
  if (!store) {
    throw new Error('Store is not initialized yet.');
  }

  return store;
};

const applyThemePreference = (theme: ThemePreference): void => {
  if (theme === 'system') {
    nativeTheme.themeSource = 'system';
    return;
  }

  nativeTheme.themeSource = theme;
};

const buildWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0f0f0f',
    title: 'ModelSweeper',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => null);
    return { action: 'deny' };
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl).catch(() => null);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html')).catch(() => null);
  }
};

const resolvedIntegrationPaths = (customPath?: string): Record<IntegrationAppName, string> => ({
  opencode: resolveConfigPath('opencode'),
  claude: resolveConfigPath('claude'),
  cursor: resolveConfigPath('cursor'),
  custom: customPath ? resolveConfigPath('custom', customPath) : '',
});

const setupIpc = (): void => {
  ipcMain.handle('get-system-ram', async () => getSystemRamSnapshot());

  ipcMain.handle('get-settings', async () => getStore().get('settings'));

  ipcMain.handle('save-settings', async (_event, settings: AppSettings) => {
    getStore().set('settings', settings);
    applyThemePreference(settings.theme);
    app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
    return settings;
  });

  ipcMain.handle('get-presets', async () => {
    const presets = await readPresetsFromDisk();
    const activePresetId = getStore().get('activePresetId') ?? presets[0]?.id ?? null;

    if (activePresetId) {
      getStore().set('activePresetId', activePresetId);
    }

    return {
      presets,
      activePresetId,
      filePath: getPresetsFilePath(),
    };
  });

  ipcMain.handle('save-presets', async (_event, payload: { presets: Preset[]; activePresetId: string | null }) => {
    await writePresetsToDisk(payload.presets);
    getStore().set('activePresetId', payload.activePresetId);

    return {
      ok: true,
      filePath: getPresetsFilePath(),
    };
  });

  ipcMain.handle('set-active-preset', async (_event, presetId: string | null) => {
    getStore().set('activePresetId', presetId);
    return { ok: true };
  });

  ipcMain.handle('get-integrations', async () => {
    const integrations = getStore().get('integrations');

    return {
      integrations,
      paths: resolvedIntegrationPaths(integrations.custom.customPath),
    };
  });

  ipcMain.handle('save-integrations', async (_event, integrations: IntegrationsState) => {
    getStore().set('integrations', integrations);
    return {
      ok: true,
      integrations,
    };
  });

  ipcMain.handle(
    'read-config',
    async (_event, payload: { appName: IntegrationAppName; customPath?: string }) => {
      const result = await readConfigFile(payload.appName, payload.customPath);

      return {
        ok: true,
        ...result,
      };
    },
  );

  ipcMain.handle(
    'write-config',
    async (
      _event,
      payload: {
        appName: IntegrationAppName;
        config: Record<string, unknown>;
        autoBackup?: boolean;
        customPath?: string;
        backupDirectory?: string;
      },
    ) => {
      const result = await writeConfigFile(payload);

      return {
        ok: true,
        ...result,
      };
    },
  );

  ipcMain.handle(
    'restore-backup',
    async (
      _event,
      payload: { appName: IntegrationAppName; customPath?: string; backupDirectory?: string },
    ) => {
      const result = await restoreLatestBackup(
        payload.appName,
        payload.customPath,
        payload.backupDirectory,
      );

      return {
        ok: true,
        ...result,
      };
    },
  );

  ipcMain.handle('pick-directory', async () => {
    const response = mainWindow
      ? await dialog.showOpenDialog(mainWindow, {
          properties: ['openDirectory', 'createDirectory'],
        })
      : await dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory'],
        });

    if (response.canceled || response.filePaths.length === 0) {
      return null;
    }

    return response.filePaths[0];
  });
};

const bootstrap = async (): Promise<void> => {
  app.setName('ModelSweeper');
  await app.whenReady();

  store = new Store<StoreSchema>({
    name: 'state',
    defaults: {
      settings: {
        ollamaBaseUrl: 'http://localhost:11434',
        backupDirectory: path.join(app.getPath('userData'), 'backups'),
        theme: 'dark',
        launchAtLogin: false,
      },
      activePresetId: null,
      integrations: defaultIntegrations(),
    },
  });

  applyThemePreference(getStore().get('settings').theme);
  app.setLoginItemSettings({ openAtLogin: getStore().get('settings').launchAtLogin });

  setupIpc();
  buildWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      buildWindow();
    }
  });
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

bootstrap().catch((error) => {
  console.error('[main] Failed to bootstrap ModelSweeper:', error);
  app.quit();
});
