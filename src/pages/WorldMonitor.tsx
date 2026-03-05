import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ExternalLink, Lock, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';

const WORLD_MONITOR_URL =
  'https://finance.worldmonitor.app/?lat=20.0000&lon=0.0000&zoom=1.00&view=global&timeRange=7d&layers=cables%2Cpipelines%2Csanctions%2Cweather%2Ceconomic%2Cwaterways%2Coutages%2Cnatural%2CtradeRoutes';

const WorldMonitor = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { isActive, plan, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const isLoading = authLoading || subLoading;
  const hasAccess = isAdmin || (isActive && (plan === 'analyst' || plan === 'boardroom'));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-display text-xl font-bold flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              World Monitor — Macro & Geopolitical Overlays
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cables, pipelines, sanctions, weather, outages, trade routes (7d).
            </p>
          </div>
          <a
            href={WORLD_MONITOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in new tab
          </a>
        </div>
      </div>
      <div className="flex-1 relative min-h-[calc(100vh-8rem)]">
        {!iframeLoaded && !iframeError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading World Monitor…</p>
            </div>
          </div>
        )}
        {iframeError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center">
              <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Unable to load World Monitor embed.</p>
              <a
                href={WORLD_MONITOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                Open in new tab instead
              </a>
            </div>
          </div>
        )}
        <iframe
          src={WORLD_MONITOR_URL}
          title="World Monitor Finance Map"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups"
          loading="lazy"
          onLoad={() => setIframeLoaded(true)}
          onError={() => setIframeError(true)}
          style={{ minHeight: 'calc(100vh - 8rem)' }}
        />
      </div>
    </div>
  );
};

export default WorldMonitor;
