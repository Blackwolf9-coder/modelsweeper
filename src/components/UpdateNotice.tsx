import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSystemStore } from '@/store/systemStore';

export const UpdateNotice = () => {
  const updateStatus = useSystemStore((state) => state.updateStatus);
  const checkForUpdates = useSystemStore((state) => state.checkForUpdates);
  const openReleasePage = useSystemStore((state) => state.openReleasePage);

  if (updateStatus.state === 'available') {
    return (
      <Card className="mb-4 border-emerald-500/35 bg-emerald-950/20">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-200">
              Update available: v{updateStatus.latestVersion ?? 'new'}
            </p>
            <p className="text-xs text-emerald-100/80">
              Current version: v{updateStatus.currentVersion}. Install the latest build from Releases.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void checkForUpdates()}>
              Check Again
            </Button>
            <Button onClick={() => void openReleasePage()}>Open Update</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (updateStatus.state === 'error') {
    return (
      <Card className="mb-4 border-amber-500/35 bg-amber-950/20">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-200">Update check failed</p>
            <p className="text-xs text-amber-100/80">{updateStatus.error ?? 'Unknown updater error.'}</p>
          </div>
          <Button variant="outline" onClick={() => void checkForUpdates()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (updateStatus.state === 'checking') {
    return (
      <Card className="mb-4 border-border/70 bg-background/55">
        <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Checking for updates...
        </CardContent>
      </Card>
    );
  }

  return null;
};
