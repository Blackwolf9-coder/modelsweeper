import { useMemo, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { IntegrationAppName } from '@/types';
import { usePresetsStore } from '@/store/presetsStore';
import { useSystemStore } from '@/store/systemStore';

const appLabels: Record<IntegrationAppName, string> = {
  opencode: 'OpenCode',
  claude: 'Claude Code',
  cursor: 'Cursor',
  custom: 'Custom',
};

const toOllamaModelRef = (modelName?: string): string | undefined => {
  if (!modelName?.trim()) {
    return undefined;
  }

  const raw = modelName.trim();

  if (raw.includes('/')) {
    const [provider, model] = raw.split('/', 2);

    if (provider === 'ollama') {
      return `ollama/${model.includes(':') ? model : `${model}:latest`}`;
    }

    return raw;
  }

  return `ollama/${raw.includes(':') ? raw : `${raw}:latest`}`;
};

const toOpenCodeBaseUrl = (value: string): string => {
  const normalized = value.trim().replace(/\/+$/g, '');

  if (!normalized) {
    return 'http://127.0.0.1:11434/v1';
  }

  if (normalized.endsWith('/v1')) {
    return normalized;
  }

  return `${normalized}/v1`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const opencodeNoTools = {
  invalid: false,
  question: false,
  bash: false,
  read: false,
  glob: false,
  grep: false,
  edit: false,
  write: false,
  task: false,
  webfetch: false,
  todowrite: false,
  skill: false,
} as const;

const opencodeAllTools = {
  invalid: true,
  question: true,
  bash: true,
  read: true,
  glob: true,
  grep: true,
  edit: true,
  write: true,
  task: true,
  webfetch: true,
  todowrite: true,
  skill: true,
} as const;

const toOllamaModelId = (modelRef: string): string | null => {
  if (!modelRef.startsWith('ollama/')) {
    return null;
  }

  return modelRef.replace(/^ollama\//, '');
};

const checkModelToolsSupport = async (openCodeBaseUrl: string, modelRef: string): Promise<boolean> => {
  const modelId = toOllamaModelId(modelRef);

  if (!modelId) {
    return false;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(`${openCodeBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'Respond with ok.' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'ping',
              description: 'Returns pong',
              parameters: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                },
                required: ['value'],
              },
            },
          },
        ],
        tool_choice: 'auto',
        max_tokens: 8,
        temperature: 0,
      }),
    });

    if (response.ok) {
      return true;
    }

    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string }; message?: string }
      | null;

    const message = payload?.error?.message ?? payload?.message ?? '';

    if (typeof message === 'string' && message.toLowerCase().includes('does not support tools')) {
      return false;
    }

    return false;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
};

export const IntegrationsPage = () => {
  const [status, setStatus] = useState<Record<IntegrationAppName, string>>({
    opencode: '',
    claude: '',
    cursor: '',
    custom: '',
  });
  const [configPreview, setConfigPreview] = useState<Record<IntegrationAppName, string>>({
    opencode: '',
    claude: '',
    cursor: '',
    custom: '',
  });

  const { integrations, integrationPaths, updateIntegration, saveIntegrations, settings } = useSystemStore();
  const { presets, activePresetId } = usePresetsStore();

  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === activePresetId) ?? null,
    [presets, activePresetId],
  );

  const buildOpenCodePayload = async () => {
    if (!activePreset) {
      throw new Error('No active preset selected.');
    }

    const thinker = toOllamaModelRef(activePreset.thinker);
    const coder = toOllamaModelRef(activePreset.coder);
    const reviewer = toOllamaModelRef(activePreset.reviewer);
    const primary = coder ?? thinker ?? reviewer ?? toOllamaModelRef(activePreset.customSlots[0]?.modelName);
    const planModel = thinker ?? primary;
    const exploreModel = reviewer ?? primary;

    if (!primary || !planModel || !exploreModel) {
      throw new Error('Active preset has no model selected.');
    }

    const openCodeBaseUrl = toOpenCodeBaseUrl(settings.ollamaBaseUrl);
    const toolSupportCache = new Map<string, boolean>();

    const modelRefs = Array.from(new Set([planModel, primary, exploreModel]));

    for (const modelRef of modelRefs) {
      const directSupport = await checkModelToolsSupport(openCodeBaseUrl, modelRef);
      toolSupportCache.set(modelRef, directSupport);
    }

    const toolsFor = (modelRef: string) =>
      toolSupportCache.get(modelRef) ? { ...opencodeAllTools } : { ...opencodeNoTools };

    const agent: Record<string, { model: string; tools: Record<string, boolean> }> = {
      plan: { model: planModel, tools: toolsFor(planModel) },
      build: { model: primary, tools: toolsFor(primary) },
      general: { model: primary, tools: toolsFor(primary) },
      explore: { model: exploreModel, tools: toolsFor(exploreModel) },
    };

    const disabledToolModels = modelRefs.filter((modelRef) => !toolSupportCache.get(modelRef));
    const enabledToolModels = modelRefs.filter((modelRef) => toolSupportCache.get(modelRef));

    const config = {
      model: primary,
      small_model: primary,
      provider: {
        ollama: {
          options: {
            baseURL: openCodeBaseUrl,
          },
        },
      },
      agent,
    } as Record<string, unknown>;

    return {
      config,
      disabledToolModels,
      enabledToolModels,
    };
  };

  const buildClaudePayload = () => {
    if (!activePreset) {
      throw new Error('No active preset selected.');
    }

    const model = toOllamaModelRef(
      activePreset.coder ?? activePreset.thinker ?? activePreset.reviewer ?? activePreset.customSlots[0]?.modelName,
    );

    if (!model) {
      throw new Error('Active preset has no model selected.');
    }

    return {
      model,
    } as Record<string, unknown>;
  };

  const buildCursorPayload = () => {
    if (!activePreset) {
      throw new Error('No active preset selected.');
    }

    const model = toOllamaModelRef(
      activePreset.coder ?? activePreset.thinker ?? activePreset.reviewer ?? activePreset.customSlots[0]?.modelName,
    );

    if (!model) {
      throw new Error('Active preset has no model selected.');
    }

    return {
      'modelsweeper.activePreset': activePreset.name,
      'modelsweeper.model': model,
      'modelsweeper.mode': activePreset.mode,
    } as Record<string, unknown>;
  };

  const buildCustomPayload = () => {
    if (!activePreset) {
      throw new Error('No active preset selected.');
    }

    return {
      presetName: activePreset.name,
      mode: activePreset.mode,
      models: {
        thinker: activePreset.thinker ?? null,
        coder: activePreset.coder ?? null,
        reviewer: activePreset.reviewer ?? null,
        custom: activePreset.customSlots,
      },
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>;
  };

  const readCurrentConfig = async (appName: IntegrationAppName) => {
    if (!window.electronAPI) {
      return;
    }

    try {
      const customPath = appName === 'custom' ? integrations.custom.customPath : undefined;
      const response = await window.electronAPI.readConfig({ appName, customPath });

      setConfigPreview((current) => ({
        ...current,
        [appName]: JSON.stringify(response.config, null, 2),
      }));

      setStatus((current) => ({
        ...current,
        [appName]: `Loaded from ${response.path}`,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to read config.';
      setStatus((current) => ({
        ...current,
        [appName]: message,
      }));
    }
  };

  const applyPreset = async (appName: IntegrationAppName) => {
    if (!window.electronAPI) {
      return;
    }

    try {
      const customPath = appName === 'custom' ? integrations.custom.customPath : undefined;

      if (appName === 'custom' && !customPath) {
        throw new Error('Please set custom config path first.');
      }

      let config: Record<string, unknown>;

      let opencodeSummary: {
        disabledToolModels: string[];
        enabledToolModels: string[];
      } | null = null;

      if (appName === 'opencode') {
        const payload = await buildOpenCodePayload();
        config = payload.config;
        opencodeSummary = {
          disabledToolModels: payload.disabledToolModels,
          enabledToolModels: payload.enabledToolModels,
        };
      } else if (appName === 'claude') {
        config = buildClaudePayload();
      } else if (appName === 'cursor') {
        config = buildCursorPayload();
      } else {
        config = buildCustomPayload();
      }

      if (appName === 'custom' && integrations.custom.template?.trim()) {
        try {
          const templatePayload = JSON.parse(integrations.custom.template) as unknown;

          if (!isRecord(templatePayload)) {
            throw new Error('Custom template must be a JSON object.');
          }

          config = {
            ...templatePayload,
            ...config,
          };
        } catch {
          throw new Error('Custom template must be valid JSON.');
        }
      }

      const response = await window.electronAPI.writeConfig({
        appName,
        config,
        autoBackup: integrations[appName].autoBackup,
        customPath,
        backupDirectory: settings.backupDirectory,
      });

      updateIntegration(appName, { lastAppliedAt: new Date().toISOString() });

      setStatus((current) => ({
        ...current,
        [appName]: (() => {
          const baseMessage = response.backupPath
            ? `Applied. Backup created: ${response.backupPath}`
            : `Applied without backup at ${response.path}`;

          if (appName !== 'opencode' || !opencodeSummary) {
            return baseMessage;
          }

          const enabled = opencodeSummary.enabledToolModels;
          const disabled = opencodeSummary.disabledToolModels;
          const extras: string[] = [];

          if (enabled.length > 0) {
            extras.push(`Tools enabled: ${enabled.join(', ')}`);
          }

          if (disabled.length > 0) {
            extras.push(`Tools disabled (unsupported): ${disabled.join(', ')}`);
          }

          return extras.length > 0 ? `${baseMessage}. ${extras.join(' | ')}` : baseMessage;
        })(),
      }));

      await readCurrentConfig(appName);
      await saveIntegrations();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply preset.';
      setStatus((current) => ({
        ...current,
        [appName]: message,
      }));
    }
  };

  const restoreBackup = async (appName: IntegrationAppName) => {
    if (!window.electronAPI) {
      return;
    }

    try {
      const customPath = appName === 'custom' ? integrations.custom.customPath : undefined;

      const response = await window.electronAPI.restoreBackup({
        appName,
        customPath,
        backupDirectory: settings.backupDirectory,
      });

      setStatus((current) => ({
        ...current,
        [appName]: `Restored from ${response.restoredFrom}`,
      }));

      await readCurrentConfig(appName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore backup.';
      setStatus((current) => ({
        ...current,
        [appName]: message,
      }));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>App Integrations</CardTitle>
          <CardDescription>
            Apply active presets into config files with safe backup before overwrite.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {(Object.keys(appLabels) as IntegrationAppName[]).map((appName) => {
          const entry = integrations[appName];
          const path = appName === 'custom' ? entry.customPath || '' : integrationPaths[appName];

          return (
            <Card key={appName}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{appLabels[appName]}</CardTitle>
                    <CardDescription className="break-all text-xs">{path || 'No path configured yet'}</CardDescription>
                  </div>
                  <Badge variant={entry.enabled ? 'success' : 'secondary'}>{entry.enabled ? 'Enabled' : 'Disabled'}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleRow
                    label="Enable integration"
                    checked={entry.enabled}
                    onChange={(checked) => updateIntegration(appName, { enabled: checked })}
                  />
                  <ToggleRow
                    label="Auto-backup before write"
                    checked={entry.autoBackup}
                    onChange={(checked) => updateIntegration(appName, { autoBackup: checked })}
                  />
                </div>

                {appName === 'custom' ? (
                  <div className="space-y-3 rounded-lg border border-border/60 bg-background/35 p-3">
                    <label className="space-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Custom config path</span>
                      <Input
                        value={entry.customPath ?? ''}
                        onChange={(event) => updateIntegration('custom', { customPath: event.target.value })}
                        placeholder="~/path/to/config.json"
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">JSON template (optional)</span>
                      <textarea
                        value={entry.template ?? '{}'}
                        onChange={(event) => updateIntegration('custom', { template: event.target.value })}
                        className="min-h-[120px] w-full rounded-lg border border-input bg-background/40 p-3 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </label>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      void readCurrentConfig(appName);
                    }}
                  >
                    Read Config
                  </Button>
                  <Button
                    disabled={!entry.enabled}
                    onClick={() => {
                      void applyPreset(appName);
                    }}
                  >
                    <Save className="mr-1 h-4 w-4" />
                    Apply Preset
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      void restoreBackup(appName);
                    }}
                  >
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Restore Backup
                  </Button>
                </div>

                {status[appName] ? (
                  <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-xs text-muted-foreground">
                    {status[appName]}
                  </div>
                ) : null}

                {configPreview[appName] ? (
                  <pre className="max-h-60 overflow-auto rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
                    {configPreview[appName]}
                  </pre>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const ToggleRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/35 px-3 py-2 text-sm">
    <span>{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);
