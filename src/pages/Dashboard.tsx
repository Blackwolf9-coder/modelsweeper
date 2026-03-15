import { AlertTriangle, CheckCircle2, MemoryStick } from 'lucide-react';
import { RAMBar } from '@/components/RAMBar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PresetCard } from '@/components/PresetCard';
import { estimatePresetRam } from '@/lib/ramEstimator';
import { formatBytesToGb } from '@/lib/utils';
import { useModelsStore } from '@/store/modelsStore';
import { usePresetsStore } from '@/store/presetsStore';
import { useSystemStore } from '@/store/systemStore';

export const DashboardPage = () => {
  const { systemRam } = useSystemStore();
  const models = useModelsStore((state) => state.models);
  const { presets, activePresetId, setActivePreset } = usePresetsStore();

  const activePreset = presets.find((preset) => preset.id === activePresetId);
  const activeEstimate = estimatePresetRam(activePreset, models, systemRam);

  const exceedsAvailable = activeEstimate.totalRuntimeGb > systemRam.free / 1024 ** 3;

  return (
    <div className="space-y-6">
      <header className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border-primary/25 bg-[linear-gradient(130deg,rgba(59,130,246,0.16),rgba(168,85,247,0.12),rgba(15,15,15,0.7))]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MemoryStick className="h-5 w-5" />
              Live System RAM
            </CardTitle>
            <CardDescription>Updates every 2 seconds to keep model load decisions accurate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Stat label="Total" value={formatBytesToGb(systemRam.total)} />
              <Stat label="Used" value={formatBytesToGb(systemRam.used)} />
              <Stat label="Available" value={formatBytesToGb(systemRam.free)} />
            </div>

            <RAMBar
              percent={(systemRam.used / Math.max(systemRam.total, 1)) * 100}
              label="Current machine usage"
              valueText={`${((systemRam.used / Math.max(systemRam.total, 1)) * 100).toFixed(0)}%`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected Preset Load</CardTitle>
            <CardDescription>Runtime estimate includes 10% overhead per selected model.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RAMBar
              percent={activeEstimate.usagePercentOfTotal}
              label="Expected RAM impact"
              valueText={`${activeEstimate.totalRuntimeGb.toFixed(1)} GB`}
            />

            <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
              {exceedsAvailable ? (
                <div className="flex items-center gap-2 text-red-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Warning: selected models exceed currently available RAM.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Configuration fits available memory right now.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Active Preset</CardTitle>
          <CardDescription>One-click switching for your top workflows.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {presets.map((preset) => {
            const estimate = estimatePresetRam(preset, models, systemRam);

            return (
              <PresetCard
                key={preset.id}
                preset={preset}
                estimatedRamGb={estimate.totalRuntimeGb}
                active={preset.id === activePresetId}
                onActivate={(presetId) => {
                  void setActivePreset(presetId);
                }}
              />
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Selection Details</CardTitle>
          <CardDescription>Model-by-model runtime memory estimate for active preset.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeEstimate.perModelRuntimeGb.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
              No models selected in active preset.
            </div>
          ) : (
            activeEstimate.perModelRuntimeGb.map((item) => (
              <div key={item.modelName} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                <div className="font-medium">{item.modelName}</div>
                <Badge variant="secondary">{item.runtimeGb.toFixed(1)} GB</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border/60 bg-background/35 px-3 py-2">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
  </div>
);
