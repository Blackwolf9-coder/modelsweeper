import { create } from 'zustand';
import type {
  AppSettings,
  IntegrationAppName,
  IntegrationsState,
  IntegrationEntry,
  SystemRamSnapshot,
  UpdateStatus,
} from '@/types';

interface SystemState {
  systemRam: SystemRamSnapshot;
  settings: AppSettings;
  integrations: IntegrationsState;
  integrationPaths: Record<IntegrationAppName, string>;
  updateStatus: UpdateStatus;
  isBootstrapped: boolean;
  refreshSystemRam: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  loadIntegrations: () => Promise<void>;
  saveIntegrations: () => Promise<void>;
  updateIntegration: (appName: IntegrationAppName, patch: Partial<IntegrationEntry>) => void;
  pickDirectory: () => Promise<string | null>;
  loadUpdateStatus: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  openReleasePage: () => Promise<void>;
  subscribeToUpdateEvents: () => void;
  unsubscribeFromUpdateEvents: () => void;
}

const defaultSettings: AppSettings = {
  ollamaBaseUrl: 'http://localhost:11434',
  backupDirectory: '',
  theme: 'dark',
  launchAtLogin: false,
};

const defaultIntegrations: IntegrationsState = {
  opencode: { enabled: true, autoBackup: true },
  claude: { enabled: true, autoBackup: true },
  cursor: { enabled: false, autoBackup: true },
  custom: { enabled: false, autoBackup: true, customPath: '', template: '{}' },
};

const emptyRam: SystemRamSnapshot = {
  total: 0,
  free: 0,
  used: 0,
};
const defaultUpdateStatus: UpdateStatus = {
  state: 'idle',
  currentVersion: '0.0.0',
};

const defaultPaths: Record<IntegrationAppName, string> = {
  opencode: '',
  claude: '',
  cursor: '',
  custom: '',
};

let removeUpdateListener: (() => void) | null = null;

export const useSystemStore = create<SystemState>((set, get) => ({
  systemRam: emptyRam,
  settings: defaultSettings,
  integrations: defaultIntegrations,
  integrationPaths: defaultPaths,
  updateStatus: defaultUpdateStatus,
  isBootstrapped: false,

  refreshSystemRam: async () => {
    const api = window.electronAPI;

    if (!api) {
      return;
    }

    const systemRam = await api.getSystemRam();
    set({ systemRam });
  },

  loadSettings: async () => {
    const api = window.electronAPI;

    if (!api) {
      set({ isBootstrapped: true });
      return;
    }

    const settings = await api.getSettings();
    set({ settings, isBootstrapped: true });
  },

  saveSettings: async (settings) => {
    const api = window.electronAPI;

    if (!api) {
      set({ settings });
      return;
    }

    const saved = await api.saveSettings(settings);
    set({ settings: saved });
  },

  loadIntegrations: async () => {
    const api = window.electronAPI;

    if (!api) {
      return;
    }

    const response = await api.getIntegrations();
    set({
      integrations: response.integrations,
      integrationPaths: response.paths,
    });
  },

  saveIntegrations: async () => {
    const api = window.electronAPI;

    if (!api) {
      return;
    }

    const { integrations } = get();
    const response = await api.saveIntegrations(integrations);

    set({ integrations: response.integrations });
  },

  updateIntegration: (appName, patch) => {
    set((state) => ({
      integrations: {
        ...state.integrations,
        [appName]: {
          ...state.integrations[appName],
          ...patch,
        },
      },
    }));
  },

  pickDirectory: async () => {
    const api = window.electronAPI;

    if (!api) {
      return null;
    }

    return api.pickDirectory();
  },

  loadUpdateStatus: async () => {
    const api = window.electronAPI;

    if (!api) {
      return;
    }

    const updateStatus = await api.getUpdateStatus();
    set({ updateStatus });
  },

  checkForUpdates: async () => {
    const api = window.electronAPI;

    if (!api) {
      return;
    }

    const updateStatus = await api.checkForUpdates();
    set({ updateStatus });
  },

  openReleasePage: async () => {
    const api = window.electronAPI;

    if (!api) {
      return;
    }

    await api.openReleasePage();
  },

  subscribeToUpdateEvents: () => {
    const api = window.electronAPI;

    if (!api || removeUpdateListener) {
      return;
    }

    removeUpdateListener = api.onUpdateStatus((updateStatus) => {
      set({ updateStatus });
    });
  },

  unsubscribeFromUpdateEvents: () => {
    if (!removeUpdateListener) {
      return;
    }

    removeUpdateListener();
    removeUpdateListener = null;
  },
}));
