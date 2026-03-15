export type ThemePreference = 'light' | 'dark' | 'system';
export type MultiModelMode = 'simultaneous' | 'sequential';
export type PresetRole = 'thinker' | 'coder' | 'reviewer';
export type SortOption = 'name' | 'size' | 'date';
export type IntegrationAppName = 'opencode' | 'claude' | 'cursor' | 'custom';
export type UpdateState = 'idle' | 'checking' | 'available' | 'up-to-date' | 'unsupported' | 'error';

export interface SystemRamSnapshot {
  total: number;
  free: number;
  used: number;
}

export interface AppSettings {
  ollamaBaseUrl: string;
  backupDirectory: string;
  theme: ThemePreference;
  launchAtLogin: boolean;
}

export interface OllamaModel {
  name: string;
  sizeBytes: number;
  sizeGb: number;
  modifiedAt: string;
  architecture: string;
  quantization?: string;
  supportsTools: boolean;
  isToolsVariant: boolean;
  hasToolsVariantInstalled: boolean;
  isConvertibleToTools: boolean;
  toolVariantName?: string;
}

export interface CustomSlot {
  id: string;
  label: string;
  modelName: string;
}

export interface Preset {
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

export interface IntegrationEntry {
  enabled: boolean;
  autoBackup: boolean;
  customPath?: string;
  template?: string;
  lastAppliedAt?: string;
}

export type IntegrationsState = Record<IntegrationAppName, IntegrationEntry>;

export interface RamEstimation {
  perModelRuntimeGb: Array<{
    modelName: string;
    runtimeGb: number;
  }>;
  totalRuntimeGb: number;
  usagePercentOfTotal: number;
  usagePercentOfAvailable: number;
}

export interface UpdateStatus {
  state: UpdateState;
  currentVersion: string;
  latestVersion?: string;
  releaseName?: string;
  releaseNotes?: string;
  releaseDate?: string;
  checkedAt?: string;
  error?: string;
}
