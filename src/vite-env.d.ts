/// <reference types="vite/client" />

import type {
  AppSettings,
  IntegrationAppName,
  IntegrationsState,
  Preset,
  SystemRamSnapshot,
  UpdateStatus,
} from './types';

declare global {
  interface Window {
    electronAPI?: {
      getSystemRam: () => Promise<SystemRamSnapshot>;
      getSettings: () => Promise<AppSettings>;
      saveSettings: (settings: AppSettings) => Promise<AppSettings>;
      getPresets: () => Promise<{
        presets: Preset[];
        activePresetId: string | null;
        filePath: string;
      }>;
      savePresets: (payload: {
        presets: Preset[];
        activePresetId: string | null;
      }) => Promise<{ ok: boolean; filePath: string }>;
      setActivePreset: (presetId: string | null) => Promise<{ ok: boolean }>;
      getIntegrations: () => Promise<{
        integrations: IntegrationsState;
        paths: Record<IntegrationAppName, string>;
      }>;
      saveIntegrations: (
        integrations: IntegrationsState,
      ) => Promise<{ ok: boolean; integrations: IntegrationsState }>;
      readConfig: (payload: {
        appName: IntegrationAppName;
        customPath?: string;
      }) => Promise<{ ok: boolean; path: string; config: Record<string, unknown> }>;
      writeConfig: (payload: {
        appName: IntegrationAppName;
        config: Record<string, unknown>;
        autoBackup?: boolean;
        customPath?: string;
        backupDirectory?: string;
      }) => Promise<{
        ok: boolean;
        path: string;
        backupPath?: string;
        config: Record<string, unknown>;
      }>;
      restoreBackup: (payload: {
        appName: IntegrationAppName;
        customPath?: string;
        backupDirectory?: string;
      }) => Promise<{ ok: boolean; path: string; restoredFrom: string }>;
      pickDirectory: () => Promise<string | null>;
      getUpdateStatus: () => Promise<UpdateStatus>;
      checkForUpdates: () => Promise<UpdateStatus>;
      openReleasePage: () => Promise<{ ok: boolean; url: string }>;
      onUpdateStatus: (listener: (status: UpdateStatus) => void) => () => void;
    };
  }
}

export {};
