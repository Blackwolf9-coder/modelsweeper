import { create } from 'zustand';
import type { Preset, PresetRole } from '@/types';

interface PresetsState {
  presets: Preset[];
  activePresetId: string | null;
  presetsPath: string;
  loading: boolean;
  loadPresets: () => Promise<void>;
  savePresets: () => Promise<void>;
  createPreset: (name: string) => Promise<string | null>;
  updatePreset: (preset: Preset) => Promise<void>;
  deletePreset: (presetId: string) => Promise<void>;
  setActivePreset: (presetId: string | null) => Promise<void>;
  addModelToActivePreset: (modelName: string) => Promise<void>;
  setActivePresetRoleModel: (role: PresetRole, modelName: string) => Promise<void>;
}

const createPresetId = (name: string): string =>
  `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;

const persistToDisk = async (presets: Preset[], activePresetId: string | null): Promise<void> => {
  if (!window.electronAPI) {
    return;
  }

  await window.electronAPI.savePresets({ presets, activePresetId });
};

export const usePresetsStore = create<PresetsState>((set, get) => ({
  presets: [],
  activePresetId: null,
  presetsPath: '',
  loading: false,

  loadPresets: async () => {
    const api = window.electronAPI;

    if (!api) {
      return;
    }

    set({ loading: true });

    const payload = await api.getPresets();
    set({
      presets: payload.presets,
      activePresetId: payload.activePresetId,
      presetsPath: payload.filePath,
      loading: false,
    });
  },

  savePresets: async () => {
    const { presets, activePresetId } = get();
    await persistToDisk(presets, activePresetId);
  },

  createPreset: async (name) => {
    const trimmed = name.trim();

    if (!trimmed) {
      return null;
    }

    const now = new Date().toISOString();

    const preset: Preset = {
      id: createPresetId(trimmed),
      name: trimmed,
      customSlots: [],
      mode: 'simultaneous',
      createdAt: now,
      updatedAt: now,
    };

    const nextPresets = [...get().presets, preset];

    set({
      presets: nextPresets,
      activePresetId: preset.id,
    });

    await persistToDisk(nextPresets, preset.id);
    return preset.id;
  },

  updatePreset: async (preset) => {
    const next = get().presets.map((item) => (item.id === preset.id ? preset : item));
    set({ presets: next });

    await persistToDisk(next, get().activePresetId);
  },

  deletePreset: async (presetId) => {
    const filtered = get().presets.filter((preset) => preset.id !== presetId);
    const activePresetId = get().activePresetId === presetId ? filtered[0]?.id ?? null : get().activePresetId;

    set({
      presets: filtered,
      activePresetId,
    });

    if (window.electronAPI) {
      await window.electronAPI.setActivePreset(activePresetId);
    }

    await persistToDisk(filtered, activePresetId);
  },

  setActivePreset: async (presetId) => {
    set({ activePresetId: presetId });

    if (window.electronAPI) {
      await window.electronAPI.setActivePreset(presetId);
    }
  },

  addModelToActivePreset: async (modelName) => {
    const { activePresetId, presets } = get();

    if (!activePresetId) {
      return;
    }

    const nextPresets = presets.map((preset) => {
      if (preset.id !== activePresetId) {
        return preset;
      }

      const updated: Preset = {
        ...preset,
        updatedAt: new Date().toISOString(),
        customSlots: [...preset.customSlots],
      };

      if (!updated.thinker) {
        updated.thinker = modelName;
        return updated;
      }

      if (!updated.coder) {
        updated.coder = modelName;
        return updated;
      }

      if (!updated.reviewer) {
        updated.reviewer = modelName;
        return updated;
      }

      updated.customSlots.push({
        id: `slot-${Date.now().toString(36)}`,
        label: `Custom ${updated.customSlots.length + 1}`,
        modelName,
      });

      return updated;
    });

    set({ presets: nextPresets });
    await persistToDisk(nextPresets, activePresetId);
  },

  setActivePresetRoleModel: async (role, modelName) => {
    const { activePresetId, presets } = get();

    if (!activePresetId) {
      return;
    }

    const nextPresets = presets.map((preset) => {
      if (preset.id !== activePresetId) {
        return preset;
      }

      const updated: Preset = {
        ...preset,
        updatedAt: new Date().toISOString(),
      };

      if (role === 'thinker') {
        updated.thinker = modelName;
      } else if (role === 'coder') {
        updated.coder = modelName;
      } else {
        updated.reviewer = modelName;
      }

      return updated;
    });

    set({ presets: nextPresets });
    await persistToDisk(nextPresets, activePresetId);
  },
}));
