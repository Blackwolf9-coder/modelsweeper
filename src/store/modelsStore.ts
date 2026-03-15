import { create } from 'zustand';
import { convertModelToToolsVariant, fetchOllamaModels } from '@/lib/ollama';
import type { OllamaModel } from '@/types';

interface ModelsState {
  models: OllamaModel[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: string | null;
  convertingAll: boolean;
  convertingByModel: Record<string, boolean>;
  conversionStatus: string | null;
  conversionError: string | null;
  fetchModels: (baseUrl: string) => Promise<void>;
  convertModelToTools: (baseUrl: string, modelName: string) => Promise<void>;
  convertAllToTools: (baseUrl: string) => Promise<void>;
  clearConversionMessages: () => void;
}

const clearFlag = (source: Record<string, boolean>, key: string): Record<string, boolean> => {
  const next = { ...source };
  delete next[key];
  return next;
};

export const useModelsStore = create<ModelsState>((set, get) => ({
  models: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  convertingAll: false,
  convertingByModel: {},
  conversionStatus: null,
  conversionError: null,

  fetchModels: async (baseUrl) => {
    set({ loading: true, error: null });

    try {
      const models = await fetchOllamaModels(baseUrl);
      set({
        models,
        loading: false,
        error: null,
        lastFetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load models.';

      set({
        loading: false,
        error: message,
      });
    }
  },

  convertModelToTools: async (baseUrl, modelName) => {
    set((state) => ({
      conversionError: null,
      conversionStatus: null,
      convertingByModel: {
        ...state.convertingByModel,
        [modelName]: true,
      },
    }));

    try {
      const current = get().models.find((entry) => entry.name === modelName);

      if (!current) {
        throw new Error(`Model not found: ${modelName}`);
      }

      if (current.supportsTools) {
        set((state) => ({
          conversionStatus: `${modelName} already supports tools.`,
          convertingByModel: clearFlag(state.convertingByModel, modelName),
        }));
        return;
      }

      if (current.hasToolsVariantInstalled) {
        set((state) => ({
          conversionStatus: `Tools variant already exists for ${modelName}.`,
          convertingByModel: clearFlag(state.convertingByModel, modelName),
        }));
        return;
      }

      if (!current.isConvertibleToTools || !current.toolVariantName) {
        throw new Error(`${modelName} is not convertible with the current parser profile.`);
      }

      await convertModelToToolsVariant(baseUrl, current.name, current.toolVariantName);
      const models = await fetchOllamaModels(baseUrl);

      set((state) => ({
        models,
        lastFetchedAt: new Date().toISOString(),
        conversionStatus: `Created ${current.toolVariantName}`,
        conversionError: null,
        convertingByModel: clearFlag(state.convertingByModel, modelName),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to convert model.';

      set((state) => ({
        conversionError: message,
        convertingByModel: clearFlag(state.convertingByModel, modelName),
      }));
    }
  },

  convertAllToTools: async (baseUrl) => {
    const targets = get().models.filter(
      (model) => model.isConvertibleToTools && !model.supportsTools && !model.hasToolsVariantInstalled,
    );

    if (targets.length === 0) {
      set({
        conversionStatus: 'No convertible models need conversion.',
        conversionError: null,
      });
      return;
    }

    set({
      convertingAll: true,
      conversionStatus: null,
      conversionError: null,
    });

    const failures: string[] = [];
    let successCount = 0;

    for (const model of targets) {
      set((state) => ({
        convertingByModel: {
          ...state.convertingByModel,
          [model.name]: true,
        },
      }));

      try {
        if (!model.toolVariantName) {
          throw new Error('Missing target tools variant name.');
        }

        await convertModelToToolsVariant(baseUrl, model.name, model.toolVariantName);
        successCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown failure';
        failures.push(`${model.name}: ${message}`);
      } finally {
        set((state) => ({
          convertingByModel: clearFlag(state.convertingByModel, model.name),
        }));
      }
    }

    try {
      const models = await fetchOllamaModels(baseUrl);
      const summary = `Converted ${successCount}/${targets.length} models.`;

      set({
        models,
        lastFetchedAt: new Date().toISOString(),
        convertingAll: false,
        conversionStatus: summary,
        conversionError: failures.length > 0 ? failures.join(' | ') : null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh model list after conversion.';

      set({
        convertingAll: false,
        conversionStatus: `Converted ${successCount}/${targets.length} models.`,
        conversionError: failures.length > 0 ? `${failures.join(' | ')} | ${message}` : message,
      });
    }
  },

  clearConversionMessages: () => {
    set({
      conversionStatus: null,
      conversionError: null,
    });
  },
}));
