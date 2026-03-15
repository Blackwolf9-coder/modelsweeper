import { Layers3, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Preset } from '@/types';

interface PresetCardProps {
  preset: Preset;
  estimatedRamGb: number;
  active?: boolean;
  onActivate?: (presetId: string) => void;
}

export const PresetCard = ({ preset, estimatedRamGb, active = false, onActivate }: PresetCardProps) => (
  <Card
    className={
      active
        ? 'border-primary/60 bg-primary/5 shadow-lg shadow-primary/10'
        : 'border-border/70 bg-card/65 transition hover:border-primary/30'
    }
  >
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm">{preset.name}</CardTitle>
        {active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Preset</Badge>}
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="rounded-lg border border-border/60 bg-background/35 p-2">
          <div className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground/90">
            <Layers3 className="h-3 w-3" />
            Mode
          </div>
          <div className="font-medium text-foreground">{preset.mode}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/35 p-2">
          <div className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground/90">
            <Zap className="h-3 w-3" />
            Est. RAM
          </div>
          <div className="font-medium text-foreground">{estimatedRamGb.toFixed(1)} GB</div>
        </div>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <div>Thinker: {preset.thinker ?? '—'}</div>
        <div>Coder: {preset.coder ?? '—'}</div>
        <div>Reviewer: {preset.reviewer ?? '—'}</div>
      </div>

      {onActivate ? (
        <Button variant={active ? 'secondary' : 'outline'} size="sm" className="w-full" onClick={() => onActivate(preset.id)}>
          {active ? 'Active' : 'Switch'}
        </Button>
      ) : null}
    </CardContent>
  </Card>
);
