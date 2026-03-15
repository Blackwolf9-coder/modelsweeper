import type { OllamaModel, Preset, RamEstimation, SystemRamSnapshot } from '@/types';
import { clamp } from './utils';

const OVERHEAD_FACTOR = 1.1;

export const estimateModelRuntimeGb = (sizeGb: number): number => sizeGb * OVERHEAD_FACTOR;

export const collectPresetModelNames = (preset: Preset | undefined): string[] => {
  if (!preset) {
    return [];
  }

  const core = [preset.thinker, preset.coder, preset.reviewer].filter(Boolean) as string[];
  const custom = preset.customSlots.map((slot) => slot.modelName).filter(Boolean);

  return [...core, ...custom];
};

export const estimatePresetRam = (
  preset: Preset | undefined,
  models: OllamaModel[],
  system: SystemRamSnapshot,
): RamEstimation => {
  const modelNames = collectPresetModelNames(preset);

  const perModelRuntimeGb = modelNames.map((modelName) => {
    const model = models.find((entry) => entry.name === modelName);
    const runtimeGb = estimateModelRuntimeGb(model?.sizeGb ?? 0);

    return {
      modelName,
      runtimeGb,
    };
  });

  const totalRuntimeGb =
    preset?.mode === 'sequential'
      ? perModelRuntimeGb.reduce((largest, current) => Math.max(largest, current.runtimeGb), 0)
      : perModelRuntimeGb.reduce((sum, item) => sum + item.runtimeGb, 0);

  const totalSystemGb = system.total / 1024 ** 3;
  const freeSystemGb = system.free / 1024 ** 3;

  return {
    perModelRuntimeGb,
    totalRuntimeGb,
    usagePercentOfTotal: totalSystemGb === 0 ? 0 : clamp((totalRuntimeGb / totalSystemGb) * 100, 0, 999),
    usagePercentOfAvailable:
      freeSystemGb === 0 ? 0 : clamp((totalRuntimeGb / freeSystemGb) * 100, 0, 999),
  };
};
