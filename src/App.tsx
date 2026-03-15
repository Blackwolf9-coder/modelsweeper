import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { UpdateNotice } from '@/components/UpdateNotice';
import { DashboardPage } from '@/pages/Dashboard';
import { IntegrationsPage } from '@/pages/Integrations';
import { ModelsPage } from '@/pages/Models';
import { PresetBuilderPage } from '@/pages/PresetBuilder';
import { SettingsPage } from '@/pages/Settings';
import { HardwareCalculatorPage } from '@/pages/HardwareCalculator';
import { useModelsStore } from '@/store/modelsStore';
import { usePresetsStore } from '@/store/presetsStore';
import { useSystemStore } from '@/store/systemStore';

const applyTheme = (theme: 'light' | 'dark' | 'system'): void => {
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
    return;
  }

  root.classList.toggle('dark', theme === 'dark');
};

const App = () => {
  const loadSettings = useSystemStore((state) => state.loadSettings);
  const settings = useSystemStore((state) => state.settings);
  const refreshSystemRam = useSystemStore((state) => state.refreshSystemRam);
  const loadIntegrations = useSystemStore((state) => state.loadIntegrations);
  const loadUpdateStatus = useSystemStore((state) => state.loadUpdateStatus);
  const checkForUpdates = useSystemStore((state) => state.checkForUpdates);
  const subscribeToUpdateEvents = useSystemStore((state) => state.subscribeToUpdateEvents);
  const unsubscribeFromUpdateEvents = useSystemStore((state) => state.unsubscribeFromUpdateEvents);

  const loadPresets = usePresetsStore((state) => state.loadPresets);
  const fetchModels = useModelsStore((state) => state.fetchModels);

  useEffect(() => {
    const boot = async () => {
      subscribeToUpdateEvents();
      await loadSettings();
      await loadPresets();
      await loadIntegrations();
      await refreshSystemRam();
      await loadUpdateStatus();
      await checkForUpdates();
    };

    void boot();

    return () => {
      unsubscribeFromUpdateEvents();
    };
  }, [
    checkForUpdates,
    loadIntegrations,
    loadPresets,
    loadSettings,
    loadUpdateStatus,
    refreshSystemRam,
    subscribeToUpdateEvents,
    unsubscribeFromUpdateEvents,
  ]);

  useEffect(() => {
    if (!settings.ollamaBaseUrl) {
      return;
    }

    void fetchModels(settings.ollamaBaseUrl);
  }, [fetchModels, settings.ollamaBaseUrl]);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshSystemRam();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [refreshSystemRam]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className="relative flex h-full">
        <Sidebar />

        <main className="relative flex-1 overflow-auto p-6">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.14),transparent_40%),radial-gradient(circle_at_90%_10%,rgba(168,85,247,0.12),transparent_35%),linear-gradient(180deg,#0b0b11,#090a0f)]" />
          <UpdateNotice />
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/hardware" element={<HardwareCalculatorPage />} />
            <Route path="/presets" element={<PresetBuilderPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
