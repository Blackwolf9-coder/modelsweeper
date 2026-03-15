import { Bot, Calculator, Gauge, Link2, Layers, Settings2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const routes = [
  { to: '/', label: 'Dashboard', icon: Gauge },
  { to: '/models', label: 'Models', icon: Bot },
  { to: '/hardware', label: 'Hardware Calculator', icon: Calculator },
  { to: '/presets', label: 'Preset Builder', icon: Layers },
  { to: '/integrations', label: 'Integrations', icon: Link2 },
  { to: '/settings', label: 'Settings', icon: Settings2 },
];

export const Sidebar = () => (
  <aside className="relative flex h-full w-[250px] flex-col border-r border-border/70 bg-[radial-gradient(circle_at_10%_10%,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_90%_20%,rgba(168,85,247,0.15),transparent_40%),#0b0c12] p-4">
    <div className="mb-8 rounded-xl border border-primary/20 bg-primary/10 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">ModelSweeper</p>
      <h1 className="mt-1 text-xl font-semibold text-white">Model Workspace</h1>
      <p className="mt-2 text-xs text-zinc-300/80">Control center for model workflows, presets, and integrations</p>
    </div>

    <nav className="flex flex-1 flex-col gap-1.5">
      {routes.map((route) => (
        <NavLink
          key={route.to}
          to={route.to}
          end={route.to === '/'}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm text-muted-foreground transition',
              'hover:border-border/80 hover:bg-white/5 hover:text-foreground',
              isActive && 'border-primary/40 bg-primary/15 text-primary',
            )
          }
        >
          <route.icon className="h-4 w-4" />
          <span>{route.label}</span>
        </NavLink>
      ))}
    </nav>

    <div className="rounded-lg border border-border/70 bg-background/20 p-3 text-xs text-muted-foreground">
      <div className="font-medium text-foreground">Provider Flexible</div>
      <div className="mt-1">Built for local and cloud model setups with one workflow layer.</div>
    </div>
  </aside>
);
