import { useEffect, useState } from 'react';
import { FolderSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { AppSettings, ThemePreference } from '@/types';
import { useSystemStore } from '@/store/systemStore';

export const SettingsPage = () => {
  const settings = useSystemStore((state) => state.settings);
  const saveSettings = useSystemStore((state) => state.saveSettings);
  const pickDirectory = useSystemStore((state) => state.pickDirectory);

  const [form, setForm] = useState<AppSettings>(settings);
  const [savedLabel, setSavedLabel] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Global app behavior and local integration defaults.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Ollama API Base URL</span>
            <Input
              value={form.ollamaBaseUrl}
              onChange={(event) => setForm((current) => ({ ...current, ollamaBaseUrl: event.target.value }))}
              placeholder="http://localhost:11434"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">Backup Directory</span>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Input
                value={form.backupDirectory}
                onChange={(event) => setForm((current) => ({ ...current, backupDirectory: event.target.value }))}
                placeholder="/path/to/backups"
              />
              <Button
                variant="outline"
                onClick={async () => {
                  const selected = await pickDirectory();

                  if (selected) {
                    setForm((current) => ({ ...current, backupDirectory: selected }));
                  }
                }}
              >
                <FolderSearch className="mr-1 h-4 w-4" />
                Browse
              </Button>
            </div>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">Theme</span>
            <select
              value={form.theme}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  theme: event.target.value as ThemePreference,
                }))
              }
              className="h-10 w-full rounded-lg border border-input bg-background/40 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </label>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/35 px-3 py-2 text-sm">
            <span>Launch at login</span>
            <Switch
              checked={form.launchAtLogin}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, launchAtLogin: checked }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={async () => {
                await saveSettings(form);
                setSavedLabel(`Saved at ${new Date().toLocaleTimeString()}`);
              }}
            >
              Save Settings
            </Button>
            {savedLabel ? <span className="text-xs text-muted-foreground">{savedLabel}</span> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
