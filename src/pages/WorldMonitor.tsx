import { useNavigate } from 'react-router-dom';
import { Globe, ExternalLink, Lock, ShieldAlert, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';

const WORLD_MONITOR_URL =
  'https://finance.worldmonitor.app/?lat=20.0000&lon=0.0000&zoom=1.00&view=global&timeRange=7d&layers=cables%2Cpipelines%2Csanctions%2Cweather%2Ceconomic%2Cwaterways%2Coutages%2Cnatural%2CtradeRoutes';

const LAYERS = [
  'Subsea Cables',
  'Pipelines',
  'Sanctions',
  'Weather',
  'Economic',
  'Waterways',
  'Outages',
  'Natural Events',
  'Trade Routes',
];

const WorldMonitor = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { isActive, plan, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  const isLoading = authLoading || subLoading;
  const hasAccess = isAdmin || (isActive && (plan === 'analyst' || plan === 'boardroom'));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <Skeleton className="h-7 w-64 mb-2" />
          <Skeleton className="h-4 w-96 mb-4" />
          <Skeleton className="h-[60vh] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex flex-col items-center justify-center px-4 pt-32 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">World Monitor — Locked</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Macro & geopolitical overlays are available on the Analyst and Boardroom plans.
          </p>
          <Button
            onClick={() => navigate('/pricing?return_to=/world-monitor')}
            className="mt-6"
            size="lg"
          >
            Upgrade to Unlock
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              World Monitor — Macro & Geopolitical Overlays
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cables, pipelines, sanctions, weather, outages and trade routes (7d view).
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary">LIVE FEED</span>
          </div>
        </div>

        {/* Embed disabled notice + open-in-tab card */}
        <div className="glass-card glow-brand rounded-2xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left — explanation */}
            <div className="p-8 md:p-10 space-y-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Open in a Dedicated Tab</h2>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    The World Monitor provider blocks embedding inside other sites for
                    security reasons. Launch the live map in a new tab — your Omni-Scout
                    session stays open here.
                  </p>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                  Active Layers
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LAYERS.map((l) => (
                    <span
                      key={l}
                      className="rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-[11px] font-medium text-foreground/80"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href={WORLD_MONITOR_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Launch World Monitor
                </a>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>

            {/* Right — visual placeholder */}
            <div className="relative hidden md:flex items-center justify-center bg-card/40 border-l border-border/40 overflow-hidden min-h-[320px]">
              <div className="absolute inset-0 grid-pattern opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
              <div className="relative z-10 text-center px-6">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 glow-brand">
                  <Globe className="h-10 w-10 text-primary animate-pulse-slow" />
                </div>
                <div className="font-display text-sm font-bold tracking-wider text-foreground">
                  GLOBAL INFRASTRUCTURE GRID
                </div>
                <div className="mt-1 text-xs text-muted-foreground font-mono">
                  9 layers · 7d window · live
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMonitor;
