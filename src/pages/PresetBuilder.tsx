import { useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { estimatePresetRam } from '@/lib/ramEstimator';
import type { CustomSlot, MultiModelMode, Preset } from '@/types';
import { useModelsStore } from '@/store/modelsStore';
import { usePresetsStore } from '@/store/presetsStore';
import { useSystemStore } from '@/store/systemStore';

export const PresetBuilderPage = () => {
  const [newPresetName, setNewPresetName] = useState('');
  const models = useModelsStore((state) => state.models);
  const systemRam = useSystemStore((state) => state.systemRam);
  const { presets, activePresetId, createPreset, updatePreset, deletePreset, setActivePreset } = usePresetsStore();

  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === activePresetId) ?? null,
    [presets, activePresetId],
  );

  const estimation = estimatePresetRam(activePreset ?? undefined, models, systemRam);
  const feasibility = getFeasibilityBadge(estimation.usagePercentOfTotal);

  const applyPresetUpdate = (patch: Partial<Preset>) => {
    if (!activePreset) {
      return;
    }

    const next: Preset = {
      ...activePreset,
      ...patch,
      updatedAt: new Date().toISOString(),
      customSlots: patch.customSlots ?? activePreset.customSlots,
    };

    void updatePreset(next);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Preset Builder</CardTitle>
          <CardDescription>Build single or multi-model profiles and switch instantly.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={preset.id === activePresetId ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    void setActivePreset(preset.id);
                  }}
                >
                  {preset.name}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_140px]">
              <Input
                value={newPresetName}
                onChange={(event) => setNewPresetName(event.target.value)}
                placeholder="New preset name"
              />
              <Button
                onClick={() => {
                  void createPreset(newPresetName);
                  setNewPresetName('');
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Create
              </Button>
            </div>

            {!activePreset ? (
              <div className="rounded-lg border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
                Create a preset to start assigning Thinker/Coder/Reviewer slots.
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border border-border/70 bg-background/25 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <SlotSelect
                    label="🧠 Thinker"
                    value={activePreset.thinker ?? ''}
                    models={models.map((model) => model.name)}
                    onChange={(value) => applyPresetUpdate({ thinker: value || undefined })}
                  />
                  <SlotSelect
                    label="⚡ Coder"
                    value={activePreset.coder ?? ''}
                    models={models.map((model) => model.name)}
                    onChange={(value) => applyPresetUpdate({ coder: value || undefined })}
                  />
                  <SlotSelect
                    label="🔍 Reviewer"
                    value={activePreset.reviewer ?? ''}
                    models={models.map((model) => model.name)}
                    onChange={(value) => applyPresetUpdate({ reviewer: value || undefined })}
                  />
                </div>

                <div className="rounded-lg border border-border/60 bg-background/30 p-3">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">Multi-model mode</span>
                    <span className="text-muted-foreground">{activePreset.mode}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Switch
                      checked={activePreset.mode === 'simultaneous'}
                      onCheckedChange={(checked) => {
                        const mode: MultiModelMode = checked ? 'simultaneous' : 'sequential';
                        applyPresetUpdate({ mode });
                      }}
                    />
                    <span>{activePreset.mode === 'simultaneous' ? 'Simultaneous' : 'Sequential'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Custom Slots</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const customSlots = [
                          ...activePreset.customSlots,
                          {
                            id: `slot-${Date.now().toString(36)}`,
                            label: `Custom ${activePreset.customSlots.length + 1}`,
                            modelName: '',
                          },
                        ];

                        applyPresetUpdate({ customSlots });
                      }}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Slot
                    </Button>
                  </div>

                  {activePreset.customSlots.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No custom slots yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {activePreset.customSlots.map((slot) => (
                        <CustomSlotEditor
                          key={slot.id}
                          slot={slot}
                          models={models.map((model) => model.name)}
                          onChange={(nextSlot) => {
                            const customSlots = activePreset.customSlots.map((entry) =>
                              entry.id === nextSlot.id ? nextSlot : entry,
                            );

                            applyPresetUpdate({ customSlots });
                          }}
                          onDelete={(slotId) => {
                            const customSlots = activePreset.customSlots.filter((slotEntry) => slotEntry.id !== slotId);
                            applyPresetUpdate({ customSlots });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Live RAM Feasibility</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estimated usage</span>
                  <span className="font-semibold">{estimation.totalRuntimeGb.toFixed(1)} GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Of total RAM</span>
                  <span>{estimation.usagePercentOfTotal.toFixed(1)}%</span>
                </div>
                <div className="pt-1">
                  <Badge variant={feasibility.variant}>{feasibility.label}</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-2">
              <Button
                onClick={() => {
                  void usePresetsStore.getState().savePresets();
                }}
              >
                <Save className="mr-1 h-4 w-4" />
                Save Presets
              </Button>

              <Button
                variant="danger"
                disabled={!activePreset}
                onClick={() => {
                  if (!activePreset) {
                    return;
                  }

                  void deletePreset(activePreset.id);
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete Active Preset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SlotSelect = ({
  label,
  value,
  models,
  onChange,
}: {
  label: string;
  value: string;
  models: string[];
  onChange: (value: string) => void;
}) => (
  <label className="space-y-1.5">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-input bg-background/40 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">None</option>
      {models.map((modelName) => (
        <option key={modelName} value={modelName}>
          {modelName}
        </option>
      ))}
    </select>
  </label>
);

const CustomSlotEditor = ({
  slot,
  models,
  onChange,
  onDelete,
}: {
  slot: CustomSlot;
  models: string[];
  onChange: (slot: CustomSlot) => void;
  onDelete: (slotId: string) => void;
}) => (
  <div className="grid gap-2 rounded-lg border border-border/60 bg-background/35 p-3 md:grid-cols-[1fr_1fr_auto]">
    <Input
      value={slot.label}
      onChange={(event) => onChange({ ...slot, label: event.target.value })}
      placeholder="Slot label"
    />
    <select
      value={slot.modelName}
      onChange={(event) => onChange({ ...slot, modelName: event.target.value })}
      className="h-10 rounded-lg border border-input bg-background/40 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">None</option>
      {models.map((modelName) => (
        <option key={modelName} value={modelName}>
          {modelName}
        </option>
      ))}
    </select>
    <Button variant="outline" size="icon" onClick={() => onDelete(slot.id)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
);

const getFeasibilityBadge = (usagePercent: number): { label: string; variant: 'success' | 'warning' | 'danger' } => {
  if (usagePercent < 80) {
    return { label: '✅ Safe', variant: 'success' };
  }

  if (usagePercent <= 95) {
    return { label: '⚠️ Tight', variant: 'warning' };
  }

  return { label: '❌ Exceeds RAM', variant: 'danger' };
};
