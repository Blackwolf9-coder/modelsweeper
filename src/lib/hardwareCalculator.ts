export type InferenceMode = 'incremental' | 'bulk';
export type MemoryMode = 'discrete' | 'unified';
export type ModelQuantization = 'F16' | 'Q8' | 'Q6' | 'Q5' | 'Q4' | 'GPTQ' | 'AWQ';
export type KvCacheQuantization = 'F16' | 'Q8' | 'Q5' | 'Q4';

export interface HardwareCalculatorInput {
  paramsB: number;
  modelQuant: ModelQuantization;
  contextLength: number;
  inferenceMode: InferenceMode;
  useKvCache: boolean;
  kvCacheQuant: KvCacheQuantization;
  memoryMode: MemoryMode;
  systemRamGb: number;
  gpuVramGb: number;
}

export interface HardwareCalculatorResult {
  requiredVramGb: number;
  onDiskSizeGb: number;
  minSystemRamGb: number;
  unifiedUsableGb: number;
  fitsUnified: boolean;
  gpusRequired: number;
  gpuRecommendation: string;
}

export const getModelQuantFactor = (quant: ModelQuantization): number => {
  switch (quant) {
    case 'F16':
      return 2;
    case 'Q8':
      return 1;
    case 'Q6':
      return 0.75;
    case 'Q5':
      return 0.625;
    case 'Q4':
      return 0.5;
    case 'GPTQ':
      return 0.4;
    case 'AWQ':
      return 0.35;
    default:
      return 1;
  }
};

export const getKvQuantFactor = (quant: KvCacheQuantization): number => {
  switch (quant) {
    case 'F16':
      return 2;
    case 'Q8':
      return 1;
    case 'Q5':
      return 0.625;
    case 'Q4':
      return 0.5;
    default:
      return 1;
  }
};

export const calculateHardwareNeeds = (input: HardwareCalculatorInput): HardwareCalculatorResult => {
  const modelFactor = getModelQuantFactor(input.modelQuant);
  const baseModelMemGb = input.paramsB * modelFactor;

  let contextMemGb = 0;
  const contextScale = Math.max(1, input.contextLength) / 2048;

  if (input.inferenceMode === 'incremental') {
    if (input.useKvCache) {
      const kvFactor = getKvQuantFactor(input.kvCacheQuant);
      contextMemGb = baseModelMemGb * 0.2 * contextScale * kvFactor;
    }
  } else {
    contextMemGb = baseModelMemGb * 0.5 * contextScale;
    if (input.useKvCache) {
      const kvFactor = getKvQuantFactor(input.kvCacheQuant);
      contextMemGb += baseModelMemGb * 0.1 * contextScale * kvFactor;
    }
  }

  const requiredVramGb = (baseModelMemGb + contextMemGb) * 1.1;
  const onDiskSizeGb = input.paramsB * modelFactor;
  const minSystemRamGb = Math.max(
    8,
    input.paramsB * modelFactor * 0.5 + (input.inferenceMode === 'bulk' ? input.contextLength / 1024 : 0),
  );

  const unifiedUsableGb = input.systemRamGb * 0.75;
  const fitsUnified = requiredVramGb <= unifiedUsableGb;

  const gpusRequired = Math.ceil((requiredVramGb * 1.2) / Math.max(1, input.gpuVramGb));
  let gpuRecommendation = '';

  if (input.memoryMode === 'unified') {
    gpuRecommendation = `Unified memory (${input.systemRamGb} GB total, ~${unifiedUsableGb.toFixed(1)} GB usable)`;
  } else if (gpusRequired <= 1) {
    gpuRecommendation = `Single ${input.gpuVramGb} GB GPU`;
  } else if (gpusRequired <= 8) {
    gpuRecommendation = `${gpusRequired}x ${input.gpuVramGb} GB GPUs`;
  } else {
    gpuRecommendation = `Exceeds 8x ${input.gpuVramGb} GB GPUs`;
  }

  return {
    requiredVramGb,
    onDiskSizeGb,
    minSystemRamGb,
    unifiedUsableGb,
    fitsUnified,
    gpusRequired,
    gpuRecommendation,
  };
};
