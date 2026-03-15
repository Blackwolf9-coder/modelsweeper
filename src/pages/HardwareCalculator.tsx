import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Cpu, Database, HardDrive, Layers3, Server, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateHardwareNeeds, type HardwareCalculatorInput } from '@/lib/hardwareCalculator';

export const HardwareCalculatorPage = () => {
  const [paramsB, setParamsB] = useState(14);
  const [modelQuant, setModelQuant] = useState<HardwareCalculatorInput['modelQuant']>('Q4');
  const [contextLength, setContextLength] = useState(8192);
  const [inferenceMode, setInferenceMode] = useState<HardwareCalculatorInput['inferenceMode']>('incremental');
  const [useKvCache, setUseKvCache] = useState(true);
  const [kvCacheQuant, setKvCacheQuant] = useState<HardwareCalculatorInput['kvCacheQuant']>('Q4');
  const [memoryMode, setMemoryMode] = useState<HardwareCalculatorInput['memoryMode']>('discrete');
  const [systemRamGb, setSystemRamGb] = useState(48);
  const [gpuVramGb, setGpuVramGb] = useState(24);

  const result = useMemo(
    () =>
      calculateHardwareNeeds({
        paramsB,
        modelQuant,
        contextLength,
        inferenceMode,
        useKvCache,
        kvCacheQuant,
        memoryMode,
        systemRamGb,
        gpuVramGb,
      }),
    [contextLength, gpuVramGb, inferenceMode, kvCacheQuant, memoryMode, modelQuant, paramsB, systemRamGb, useKvCache],
  );

  const unifiedStatusVariant = result.fitsUnified ? 'success' : 'danger';
  const unifiedStatusText = result.fitsUnified ? 'Fits unified memory' : 'Exceeds unified memory';

  return (
    <div className="space-y-6">
      <Card className="border-primary/25 bg-[linear-gradient(125deg,rgba(34,197,94,0.12),rgba(14,116,144,0.1),rgba(9,10,15,0.82))]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Cpu className="h-5 w-5" />
            Hardware Calculator
          </CardTitle>
          <CardDescription>
            Clean estimate for VRAM, on-disk size, system RAM, and GPU count using the most practical inputs only.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inputs</CardTitle>
            <CardDescription>Tune your model and hardware profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="grid gap-3 md:grid-cols-2">
              <SliderField
                label="Model Size (B params)"
                value={paramsB}
                min={1}
                max={1000}
                step={1}
                onChange={setParamsB}
              />

              <Field label="Model Quantization">
                <select
                  value={modelQuant}
                  onChange={(event) => setModelQuant(event.target.value as HardwareCalculatorInput['modelQuant'])}
                  className="h-10 w-full rounded-lg border border-input bg-background/40 px-3 text-sm"
                >
                  <option value="Q4">Q4</option>
                  <option value="Q5">Q5</option>
                  <option value="Q6">Q6</option>
                  <option value="Q8">Q8</option>
                  <option value="F16">F16</option>
                  <option value="GPTQ">GPTQ</option>
                  <option value="AWQ">AWQ</option>
                </select>
              </Field>

              <SliderField
                label="Context Length (tokens)"
                value={contextLength}
                min={128}
                max={32768}
                step={128}
                onChange={setContextLength}
                formatValue={(value) => value.toLocaleString()}
              />

              <Field label="Inference Mode">
                <select
                  value={inferenceMode}
                  onChange={(event) => setInferenceMode(event.target.value as HardwareCalculatorInput['inferenceMode'])}
                  className="h-10 w-full rounded-lg border border-input bg-background/40 px-3 text-sm"
                >
                  <option value="incremental">Incremental (streaming)</option>
                  <option value="bulk">Bulk (full pass)</option>
                </select>
              </Field>
            </section>

            <section className="rounded-xl border border-border/70 bg-background/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">KV Cache</p>
                <button
                  type="button"
                  onClick={() => setUseKvCache((current) => !current)}
                  className={`rounded-md border px-2 py-1 text-xs transition ${
                    useKvCache
                      ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-100'
                      : 'border-border/80 bg-background/50 text-muted-foreground'
                  }`}
                >
                  {useKvCache ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {useKvCache ? (
                <div className="mt-3 grid gap-2 md:max-w-[280px]">
                  <Field label="KV Cache Quantization" compact>
                    <select
                      value={kvCacheQuant}
                      onChange={(event) => setKvCacheQuant(event.target.value as HardwareCalculatorInput['kvCacheQuant'])}
                      className="h-10 w-full rounded-lg border border-input bg-background/40 px-3 text-sm"
                    >
                      <option value="Q4">Q4</option>
                      <option value="Q5">Q5</option>
                      <option value="Q8">Q8</option>
                      <option value="F16">F16</option>
                    </select>
                  </Field>
                </div>
              ) : null}
            </section>

            <section className="grid gap-3 md:grid-cols-2">
              <Field label="Hardware Mode">
                <select
                  value={memoryMode}
                  onChange={(event) => setMemoryMode(event.target.value as HardwareCalculatorInput['memoryMode'])}
                  className="h-10 w-full rounded-lg border border-input bg-background/40 px-3 text-sm"
                >
                  <option value="discrete">Discrete GPU</option>
                  <option value="unified">Unified Memory</option>
                </select>
              </Field>

              <SliderField
                label="System RAM (GB)"
                value={systemRamGb}
                min={8}
                max={512}
                step={8}
                onChange={setSystemRamGb}
              />

              {memoryMode === 'discrete' ? (
                <SliderField
                  label="VRAM per GPU (GB)"
                  value={gpuVramGb}
                  min={4}
                  max={192}
                  step={4}
                  onChange={setGpuVramGb}
                />
              ) : null}
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
            <CardDescription>Practical estimate for single-user inference.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricRow
              icon={Layers3}
              label="Required VRAM"
              value={`${result.requiredVramGb.toFixed(1)} GB`}
              accent="text-sky-300"
            />
            <MetricRow
              icon={HardDrive}
              label="Model on-disk size"
              value={`${result.onDiskSizeGb.toFixed(1)} GB`}
              accent="text-indigo-300"
            />
            <MetricRow
              icon={Server}
              label="Minimum system RAM"
              value={`${result.minSystemRamGb.toFixed(1)} GB`}
              accent="text-amber-300"
            />

            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Recommended Setup</p>
                <Badge variant="secondary">{memoryMode === 'discrete' ? 'Discrete' : 'Unified'}</Badge>
              </div>
              <p className="mt-2 text-sm text-foreground">{result.gpuRecommendation}</p>
              {memoryMode === 'discrete' ? (
                <p className="mt-2 text-xs text-muted-foreground">Includes 20% headroom for fragmentation.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Usable unified memory for model allocation: <span className="font-medium">{result.unifiedUsableGb.toFixed(1)} GB</span> (~75% of
                    total RAM)
                  </p>
                  <Badge variant={unifiedStatusVariant}>
                    {result.fitsUnified ? <ShieldCheck className="mr-1 h-3.5 w-3.5" /> : <TriangleAlert className="mr-1 h-3.5 w-3.5" />}
                    {unifiedStatusText}
                  </Badge>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border/70 bg-background/30 p-3 text-xs text-muted-foreground">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <Database className="h-3.5 w-3.5" />
                Notes
              </div>
              <ul className="space-y-1">
                <li>Values are estimation-grade and meant for fast planning.</li>
                <li>Context length and KV cache have a large impact on runtime memory.</li>
                <li>Real workloads can vary based on backend, batching, and model implementation.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Field = ({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: ReactNode;
  compact?: boolean;
}) => (
  <label className={compact ? 'space-y-1' : 'space-y-1.5'}>
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    {children}
  </label>
);

const SliderField = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}) => (
  <div className="space-y-2 rounded-lg border border-border/60 bg-background/20 p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Badge variant="outline">{formatValue ? formatValue(value) : value}</Badge>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
    />
    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
      <span>{min.toLocaleString()}</span>
      <span>{max.toLocaleString()}</span>
    </div>
  </div>
);

const MetricRow = ({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
}) => (
  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/30 px-3 py-2.5">
    <div className="flex items-center gap-2 text-sm">
      <Icon className={`h-4 w-4 ${accent}`} />
      <span>{label}</span>
    </div>
    <span className={`text-sm font-semibold ${accent}`}>{value}</span>
  </div>
);
