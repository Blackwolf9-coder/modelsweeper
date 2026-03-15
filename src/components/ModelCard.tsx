import { Brain, CheckCircle2, Cpu, Plus, UserCog, Wrench } from 'lucide-react';
import { RAMBar } from '@/components/RAMBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OllamaModel } from '@/types';

interface ModelCardProps {
  model: OllamaModel;
  ramPercent: number;
  isActiveCoder: boolean;
  isActiveThinker: boolean;
  isActiveReviewer: boolean;
  onAdd: (modelName: string) => void;
  onSetCoder: (modelName: string) => void;
  onSetThinker: (modelName: string) => void;
  onSetReviewer: (modelName: string) => void;
  onConvertToTools: (modelName: string) => void;
  isConvertingToTools: boolean;
}

export const ModelCard = ({
  model,
  ramPercent,
  isActiveCoder,
  isActiveThinker,
  isActiveReviewer,
  onAdd,
  onSetCoder,
  onSetThinker,
  onSetReviewer,
  onConvertToTools,
  isConvertingToTools,
}: ModelCardProps) => (
  <Card className="group border-border/70 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <CardTitle className="text-sm tracking-tight">{model.name}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{model.sizeGb.toFixed(1)} GB</Badge>
            <Badge variant="outline">{model.architecture}</Badge>
            {model.quantization ? <Badge variant="outline">{model.quantization}</Badge> : null}
            {model.supportsTools ? (
              <Badge variant="success">Tools supported</Badge>
            ) : (
              <Badge variant="danger">No tools</Badge>
            )}
            {model.isToolsVariant ? <Badge variant="warning">Tools variant</Badge> : null}
            {!model.supportsTools && model.hasToolsVariantInstalled ? (
              <Badge variant="warning">Tools variant exists</Badge>
            ) : null}
            {!model.supportsTools && model.isConvertibleToTools ? <Badge variant="outline">Convertible</Badge> : null}
            {isActiveThinker ? <Badge variant="success">Active Thinker</Badge> : null}
            {isActiveCoder ? <Badge variant="secondary">Active Coder</Badge> : null}
            {isActiveReviewer ? <Badge variant="warning">Active Reviewer</Badge> : null}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => onAdd(model.name)} title="Add to active preset">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-3 pb-4">
      <RAMBar
        percent={ramPercent}
        label="Estimated RAM load"
        valueText={`${Math.min(999, ramPercent).toFixed(0)}%`}
      />
      {!model.supportsTools && model.isConvertibleToTools && !model.hasToolsVariantInstalled ? (
        <Button
          size="sm"
          variant="outline"
          disabled={isConvertingToTools}
          onClick={() => onConvertToTools(model.name)}
          className="w-full"
        >
          <Wrench className="mr-1 h-3.5 w-3.5" />
          {isConvertingToTools ? 'Converting...' : 'Convert to Tools'}
        </Button>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <Button size="sm" variant={isActiveCoder ? 'default' : 'secondary'} onClick={() => onSetCoder(model.name)}>
          <UserCog className="mr-1 h-3.5 w-3.5" />
          {isActiveCoder ? 'Coder ✓' : 'Set as Coder'}
        </Button>
        <Button size="sm" variant={isActiveThinker ? 'default' : 'secondary'} onClick={() => onSetThinker(model.name)}>
          <Brain className="mr-1 h-3.5 w-3.5" />
          {isActiveThinker ? 'Thinker ✓' : 'Set as Thinker'}
        </Button>
        <Button size="sm" variant={isActiveReviewer ? 'default' : 'secondary'} onClick={() => onSetReviewer(model.name)}>
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          {isActiveReviewer ? 'Reviewer ✓' : 'Set as Reviewer'}
        </Button>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Cpu className="h-3.5 w-3.5" />
        <span>Updated {new Date(model.modifiedAt).toLocaleString()}</span>
      </div>
    </CardContent>
  </Card>
);
