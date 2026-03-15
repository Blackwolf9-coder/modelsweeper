import axios from 'axios';
import type { OllamaModel } from '@/types';

interface RawOllamaModel {
  name: string;
  model?: string;
  modified_at: string;
  size: number;
  details?: {
    family?: string;
    families?: string[];
    format?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface OllamaTagsResponse {
  models: RawOllamaModel[];
}

interface OllamaShowResponse {
  capabilities?: string[];
  details?: {
    family?: string;
    families?: string[];
    quantization_level?: string;
  };
  error?: string;
}

interface CreateModelResponse {
  status?: string;
  error?: string;
}

const normalizeBaseUrl = (baseUrl: string): string => (baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl);

const splitModelName = (modelName: string): { baseName: string; tag: string } => {
  const value = modelName.trim();
  const lastColonIndex = value.lastIndexOf(':');
  const lastSlashIndex = value.lastIndexOf('/');
  const hasExplicitTag = lastColonIndex > lastSlashIndex;

  if (!hasExplicitTag) {
    return {
      baseName: value,
      tag: 'latest',
    };
  }

  return {
    baseName: value.slice(0, lastColonIndex),
    tag: value.slice(lastColonIndex + 1) || 'latest',
  };
};

const withLatestTag = (modelName: string): string => {
  const { baseName, tag } = splitModelName(modelName);
  return `${baseName}:${tag}`;
};

const isToolsVariantName = (modelName: string): boolean => {
  const { baseName } = splitModelName(modelName);
  return baseName.endsWith('-tools');
};

export const buildToolsVariantName = (modelName: string): string => {
  const { baseName, tag } = splitModelName(modelName);
  const targetBase = baseName.endsWith('-tools') ? baseName : `${baseName}-tools`;
  return `${targetBase}:${tag}`;
};

const inferArchitecture = (families: string[]): string => {
  const family = families.find((entry) => !!entry)?.trim() || 'Unknown';

  if (/mix|moe|mixture/i.test(family)) {
    return 'MoE';
  }

  return 'Dense';
};

const isLikelyToolsConvertible = (modelName: string, families: string[]): boolean => {
  const modelHint = modelName.toLowerCase();
  const familyHint = families.join(' ').toLowerCase();
  return /(qwen|coder-next|thinker)/.test(`${modelHint} ${familyHint}`);
};

const fetchModelDetails = async (
  normalizedBase: string,
  modelName: string,
): Promise<{ capabilities: string[]; families: string[]; quantization?: string }> => {
  try {
    const { data } = await axios.post<OllamaShowResponse>(
      `${normalizedBase}/api/show`,
      { model: modelName },
      { timeout: 8000 },
    );

    if (data.error) {
      return {
        capabilities: [],
        families: [],
      };
    }

    const capabilities = (data.capabilities ?? []).map((entry) => entry.toLowerCase());
    const families = [...(data.details?.families ?? []), data.details?.family ?? ''].filter(Boolean);

    return {
      capabilities,
      families,
      quantization: data.details?.quantization_level,
    };
  } catch {
    return {
      capabilities: [],
      families: [],
    };
  }
};

const runBatched = async <T, R>(
  values: T[],
  worker: (value: T) => Promise<R>,
  concurrency = 6,
): Promise<R[]> => {
  const queue = [...values];
  const output: R[] = [];

  const runners = Array.from({ length: Math.max(1, Math.min(concurrency, values.length || 1)) }).map(async () => {
    while (queue.length > 0) {
      const next = queue.shift();

      if (typeof next === 'undefined') {
        break;
      }

      output.push(await worker(next));
    }
  });

  await Promise.all(runners);
  return output;
};

export const fetchOllamaModels = async (baseUrl: string): Promise<OllamaModel[]> => {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const { data } = await axios.get<OllamaTagsResponse>(`${normalizedBase}/api/tags`, {
    timeout: 5000,
  });

  const tags = data.models ?? [];
  const modelNames = new Set(tags.map((entry) => withLatestTag(entry.name || entry.model || '')));

  const details = await runBatched(
    tags,
    async (model) => {
      const normalizedName = withLatestTag(model.name || model.model || '');
      const detail = await fetchModelDetails(normalizedBase, normalizedName);

      return {
        name: normalizedName,
        detail,
      };
    },
    6,
  );

  const detailByName = new Map(details.map((entry) => [entry.name, entry.detail]));

  return tags.map((model) => {
    const name = withLatestTag(model.name || model.model || '');
    const info = detailByName.get(name);
    const isToolsVariant = isToolsVariantName(name);
    const toolVariantName = isToolsVariant ? undefined : buildToolsVariantName(name);
    const hasToolsVariantInstalled = isToolsVariant ? true : Boolean(toolVariantName && modelNames.has(toolVariantName));

    const families = Array.from(
      new Set([
        ...(info?.families ?? []),
        ...(model.details?.families ?? []),
        model.details?.family ?? '',
        model.details?.format ?? '',
      ]),
    ).filter(Boolean);

    const supportsTools = isToolsVariant || Boolean(info?.capabilities.includes('tools'));
    const isConvertibleToTools =
      !supportsTools && !isToolsVariant && isLikelyToolsConvertible(name, families);

    return {
      name,
      sizeBytes: model.size,
      sizeGb: model.size / 1024 ** 3,
      modifiedAt: model.modified_at,
      architecture: inferArchitecture(families),
      quantization: info?.quantization ?? model.details?.quantization_level,
      supportsTools,
      isToolsVariant,
      hasToolsVariantInstalled,
      isConvertibleToTools,
      toolVariantName,
    };
  });
};

export const convertModelToToolsVariant = async (
  baseUrl: string,
  sourceModelName: string,
  targetModelName?: string,
): Promise<{ sourceModelName: string; targetModelName: string }> => {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const source = withLatestTag(sourceModelName);
  const target = targetModelName ? withLatestTag(targetModelName) : buildToolsVariantName(source);

  const { data } = await axios.post<CreateModelResponse>(
    `${normalizedBase}/api/create`,
    {
      model: target,
      from: source,
      parser: 'qwen3-coder',
      renderer: 'qwen3-coder',
      stream: false,
    },
    {
      timeout: 0,
    },
  );

  if (data?.error) {
    throw new Error(data.error);
  }

  if (data?.status && data.status.toLowerCase() !== 'success') {
    throw new Error(`Unexpected create status: ${data.status}`);
  }

  return {
    sourceModelName: source,
    targetModelName: target,
  };
};
