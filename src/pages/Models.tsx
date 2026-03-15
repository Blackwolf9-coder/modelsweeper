import { useMemo, useState } from 'react';
import { ArrowDownUp, RefreshCw, Search, Wrench } from 'lucide-react';
import { ModelCard } from '@/components/ModelCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { SortOption } from '@/types';
import { useModelsStore } from '@/store/modelsStore';
import { usePresetsStore } from '@/store/presetsStore';
import { useSystemStore } from '@/store/systemStore';
import { estimateModelRuntimeGb } from '@/lib/ramEstimator';

type ToolsFilter = 'all' | 'supported' | 'unsupported' | 'convertible' | 'variants';

export const ModelsPage = () => {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [toolsFilter, setToolsFilter] = useState<ToolsFilter>('all');
  const [showDuplicates, setShowDuplicates] = useState(false);

  const {
    models,
    loading,
    error,
    lastFetchedAt,
    convertingAll,
    convertingByModel,
    conversionStatus,
    conversionError,
    fetchModels,
    convertModelToTools,
    convertAllToTools,
  } = useModelsStore();
  const addModelToActivePreset = usePresetsStore((state) => state.addModelToActivePreset);
  const setActivePresetRoleModel = usePresetsStore((state) => state.setActivePresetRoleModel);
  const activePresetId = usePresetsStore((state) => state.activePresetId);
  const presets = usePresetsStore((state) => state.presets);

  const ollamaBaseUrl = useSystemStore((state) => state.settings.ollamaBaseUrl);
  const totalSystemRamGb = useSystemStore((state) => state.systemRam.total / 1024 ** 3);

  const modelStats = useMemo(() => {
    const supported = models.filter((model) => model.supportsTools).length;
    const unsupported = models.length - supported;
    const variants = models.filter((model) => model.isToolsVariant).length;
    const convertible = models.filter(
      (model) => !model.supportsTools && model.isConvertibleToTools && !model.hasToolsVariantInstalled,
    ).length;

    return {
      supported,
      unsupported,
      variants,
      convertible,
    };
  }, [models]);

  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === activePresetId) ?? null,
    [activePresetId, presets],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const results = models.filter((model) => {
      const shouldHideDuplicate = !showDuplicates && !model.isToolsVariant && model.hasToolsVariantInstalled;

      if (shouldHideDuplicate) {
        return false;
      }

      const toolsMatch = (() => {
        if (toolsFilter === 'supported') {
          return model.supportsTools;
        }

        if (toolsFilter === 'unsupported') {
          return !model.supportsTools;
        }

        if (toolsFilter === 'convertible') {
          return !model.supportsTools && model.isConvertibleToTools && !model.hasToolsVariantInstalled;
        }

        if (toolsFilter === 'variants') {
          return model.isToolsVariant;
        }

        return true;
      })();

      if (!toolsMatch) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return (
        model.name.toLowerCase().includes(normalized) ||
        model.architecture.toLowerCase().includes(normalized) ||
        (model.quantization ?? '').toLowerCase().includes(normalized) ||
        (model.supportsTools ? 'tools' : 'no tools').includes(normalized)
      );
    });

    return results.sort((left, right) => {
      if (sortBy === 'size') {
        return right.sizeBytes - left.sizeBytes;
      }

      if (sortBy === 'date') {
        return +new Date(right.modifiedAt) - +new Date(left.modifiedAt);
      }

      return left.name.localeCompare(right.name);
    });
  }, [models, query, sortBy, toolsFilter, showDuplicates]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Installed Local Models</CardTitle>
              <CardDescription>
                Source: <code className="rounded bg-background/60 px-1.5 py-0.5 text-xs">{ollamaBaseUrl}/api/tags</code>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{models.length} models</Badge>
              <Badge variant="success">{modelStats.supported} tools-ready</Badge>
              <Badge variant="danger">{modelStats.unsupported} no-tools</Badge>
              <Badge variant="outline">{modelStats.convertible} convertible</Badge>
              <Badge variant="warning">{modelStats.variants} variants</Badge>
              {lastFetchedAt ? <Badge variant="outline">Updated {new Date(lastFetchedAt).toLocaleTimeString()}</Badge> : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void fetchModels(ollamaBaseUrl);
                }}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_170px_165px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by model name, architecture, quantization..."
                className="pl-9"
              />
            </div>
            <label className="relative flex items-center">
              <Wrench className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
              <select
                value={toolsFilter}
                onChange={(event) => setToolsFilter(event.target.value as ToolsFilter)}
                className="h-10 w-full rounded-lg border border-input bg-background/40 pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Tools: all</option>
                <option value="supported">Tools: supported</option>
                <option value="unsupported">Tools: unsupported</option>
                <option value="convertible">Tools: convertible</option>
                <option value="variants">Tools: -tools variants</option>
              </select>
            </label>
            <label className="relative flex items-center">
              <ArrowDownUp className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="h-10 w-full rounded-lg border border-input bg-background/40 pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="name">Sort by name</option>
                <option value="size">Sort by size</option>
                <option value="date">Sort by date added</option>
              </select>
            </label>
            <Button
              variant="outline"
              disabled={convertingAll || modelStats.convertible === 0}
              onClick={() => {
                void convertAllToTools(ollamaBaseUrl);
              }}
            >
              <Wrench className="mr-1 h-3.5 w-3.5" />
              {convertingAll ? 'Converting...' : 'Convert All'}
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/35 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Show duplicate pairs (model + model-tools)
            </span>
            <Switch checked={showDuplicates} onCheckedChange={setShowDuplicates} />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
          ) : null}

          {conversionError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {conversionError}
            </div>
          ) : null}

          {conversionStatus ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {conversionStatus}
            </div>
          ) : null}

          {!activePresetId ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Create or load a preset first, then use the + button to add models.
            </div>
          ) : (
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-200">
              Tip: <span className="font-medium">Set as Coder / Thinker / Reviewer</span> changes the active preset directly.
              The <span className="font-medium">+</span> button only appends a custom slot.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((model) => {
          const runtimeGb = estimateModelRuntimeGb(model.sizeGb);
          const ramPercent = totalSystemRamGb === 0 ? 0 : (runtimeGb / totalSystemRamGb) * 100;

          return (
            <ModelCard
              key={model.name}
              model={model}
              ramPercent={ramPercent}
              isActiveCoder={activePreset?.coder === model.name}
              isActiveThinker={activePreset?.thinker === model.name}
              isActiveReviewer={activePreset?.reviewer === model.name}
              isConvertingToTools={Boolean(convertingByModel[model.name]) || convertingAll}
              onSetCoder={(modelName) => {
                void setActivePresetRoleModel('coder', modelName);
              }}
              onSetThinker={(modelName) => {
                void setActivePresetRoleModel('thinker', modelName);
              }}
              onSetReviewer={(modelName) => {
                void setActivePresetRoleModel('reviewer', modelName);
              }}
              onConvertToTools={(modelName) => {
                void convertModelToTools(ollamaBaseUrl, modelName);
              }}
              onAdd={(modelName) => {
                void addModelToActivePreset(modelName);
              }}
            />
          );
        })}
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Fetching models...</div> : null}
    </div>
  );
};
