import { contextBridge, ipcRenderer } from 'electron';
import type { IntegrationAppName } from './utils/configWriter';

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
type UpdateState = 'idle' | 'checking' | 'available' | 'up-to-date' | 'unsupported' | 'error';

interface UpdateStatus {
  state: UpdateState;
  currentVersion: string;
  latestVersion?: string;
  releaseName?: string;
  releaseNotes?: string;
  releaseDate?: string;
  checkedAt?: string;
  error?: string;
}

const api = {
  getSystemRam: () => ipcRenderer.invoke('get-system-ram') as Promise<{ total: number; free: number; used: number }>,

  getSettings: () => ipcRenderer.invoke('get-settings') as Promise<AppSettings>,
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke('save-settings', settings) as Promise<AppSettings>,

  getPresets: () =>
    ipcRenderer.invoke('get-presets') as Promise<{
      presets: Preset[];
      activePresetId: string | null;
      filePath: string;
    }>,
  savePresets: (payload: { presets: Preset[]; activePresetId: string | null }) =>
    ipcRenderer.invoke('save-presets', payload) as Promise<{ ok: boolean; filePath: string }>,
  setActivePreset: (presetId: string | null) =>
    ipcRenderer.invoke('set-active-preset', presetId) as Promise<{ ok: boolean }>,

  getIntegrations: () =>
    ipcRenderer.invoke('get-integrations') as Promise<{
      integrations: IntegrationsState;
      paths: Record<IntegrationAppName, string>;
    }>,
  saveIntegrations: (integrations: IntegrationsState) =>
    ipcRenderer.invoke('save-integrations', integrations) as Promise<{ ok: boolean; integrations: IntegrationsState }>,

  readConfig: (payload: { appName: IntegrationAppName; customPath?: string }) =>
    ipcRenderer.invoke('read-config', payload) as Promise<{ ok: boolean; path: string; config: Record<string, unknown> }>,
  writeConfig: (payload: {
    appName: IntegrationAppName;
    config: Record<string, unknown>;
    autoBackup?: boolean;
    customPath?: string;
    backupDirectory?: string;
  }) =>
    ipcRenderer.invoke('write-config', payload) as Promise<{
      ok: boolean;
      path: string;
      backupPath?: string;
      config: Record<string, unknown>;
    }>,
  restoreBackup: (payload: { appName: IntegrationAppName; customPath?: string; backupDirectory?: string }) =>
    ipcRenderer.invoke('restore-backup', payload) as Promise<{
      ok: boolean;
      path: string;
      restoredFrom: string;
    }>,

  pickDirectory: () => ipcRenderer.invoke('pick-directory') as Promise<string | null>,
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status') as Promise<UpdateStatus>,
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates') as Promise<UpdateStatus>,
  openReleasePage: () => ipcRenderer.invoke('open-release-page') as Promise<{ ok: boolean; url: string }>,
  onUpdateStatus: (listener: (status: UpdateStatus) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => {
      listener(status);
    };

    ipcRenderer.on('update-status', wrapped);

    return () => {
      ipcRenderer.removeListener('update-status', wrapped);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
