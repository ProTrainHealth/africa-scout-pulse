import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Play, Loader2, PauseCircle, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import FlowIndicator from '@/components/FlowIndicator';
import Seo from '@/components/Seo';

type JobState = {
  job_name: string;
  paused: boolean;
  pause_reason: string | null;
  last_run_at: string | null;
  last_error: string | null;
  lease_until: string | null;
  updated_at: string;
};

type ScoredCompany = {
  id: string;
  name: string;
  scout_score: number;
  institutional_flow: string;
  updated_at: string;
};

const ENGINES = [
  {
    fn: 'ingest-macro-data',
    title: 'Macro Data Ingestor',
    blurb: 'Pulls FX, commodity and sovereign-risk indicators into the macro board.',
  },
  {
    fn: 'scout-score-engine',
    title: 'AI Scout Score Engine',
    blurb: 'Scores tracked companies from recent news sentiment and updates flow.',
  },
  {
    fn: 'price-phantom-portfolio',
    title: 'Portfolio Auto-Pricer',
    blurb: 'Reprices every open Phantom Portfolio position at market close.',
  },
] as const;

const relative = (iso: string | null) =>
  iso ? `${formatDistanceToNowStrict(new Date(iso))} ago` : 'Never';

const Engine = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [states, setStates] = useState<Record<string, JobState>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [scored, setScored] = useState<ScoredCompany[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/');
  }, [authLoading, user, isAdmin, navigate]);

  const fetchAll = useCallback(async () => {
    const [{ data: jobs }, { data: companies }] = await Promise.all([
      supabase.from('job_state').select('*'),
      supabase
        .from('companies')
        .select('id, name, scout_score, institutional_flow, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10),
    ]);
    const map: Record<string, JobState> = {};
    for (const j of (jobs ?? []) as JobState[]) map[j.job_name] = j;
    setStates(map);
    setScored((companies ?? []) as ScoredCompany[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && isAdmin) fetchAll();
  }, [user, isAdmin, fetchAll]);

  const runNow = async (fn: string, title: string) => {
    setRunning(fn);
    const { data, error } = await supabase.functions.invoke(fn, { body: {} });
    setRunning(null);

    if (error) {
      toast({ title: `${title} failed`, description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: `${title} finished`,
        description: (
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
            {JSON.stringify(data, null, 2)}
          </pre>
        ),
      });
    }
    fetchAll();
  };

  if (authLoading || !isAdmin) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Engine Control Center | Analyst Panel" description="Trigger and monitor background intelligence jobs." path="/admin/engine" />

      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="font-display text-lg font-bold">
              <span className="text-gradient-brand">Engine</span> Control Center
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchAll}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </header>

      <div className="container mx-auto space-y-6 px-4 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          {ENGINES.map((e) => {
            const s = states[e.fn];
            const busy = running === e.fn;
            return (
              <div key={e.fn} className="rounded-xl border border-border/50 bg-card/40 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-sm font-bold">{e.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{e.blurb}</p>
                  </div>
                  {s?.paused ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                      <PauseCircle className="h-3 w-3" /> Paused
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  )}
                </div>

                {loading ? (
                  <Skeleton className="mt-4 h-12 w-full" />
                ) : (
                  <dl className="mt-4 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Last run</dt>
                      <dd>{relative(s?.last_run_at ?? null)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Lease</dt>
                      <dd>{s?.lease_until && new Date(s.lease_until) > new Date() ? 'Running' : 'Free'}</dd>
                    </div>
                    {s?.pause_reason && (
                      <p className="flex gap-1.5 pt-1 text-destructive">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {s.pause_reason}
                      </p>
                    )}
                    {s?.last_error && (
                      <p className="flex gap-1.5 pt-1 text-muted-foreground">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {s.last_error}
                      </p>
                    )}
                  </dl>
                )}

                <Button className="mt-4 w-full" size="sm" disabled={busy} onClick={() => runNow(e.fn, e.title)}>
                  {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1 h-3.5 w-3.5" />}
                  {busy ? 'Running...' : 'Run Now'}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-border/50 bg-card/40">
          <div className="border-b border-border/50 px-5 py-3">
            <h2 className="font-display text-sm font-bold">Recently Scored Companies</h2>
            <p className="text-xs text-muted-foreground">Latest output from the AI Scout Score Engine.</p>
          </div>
          {loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : scored.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No scores recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Company</th>
                  <th className="px-5 py-2 font-medium">Scout Score</th>
                  <th className="px-5 py-2 font-medium">Flow</th>
                  <th className="px-5 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {scored.map((c) => (
                  <tr key={c.id} className="border-b border-border/30 last:border-0">
                    <td className="px-5 py-2 font-display font-semibold">{c.name}</td>
                    <td className="px-5 py-2 font-mono">{c.scout_score}</td>
                    <td className="px-5 py-2">
                      <FlowIndicator flow={c.institutional_flow as 'inflow' | 'outflow' | 'neutral'} />
                    </td>
                    <td className="px-5 py-2 font-mono text-xs text-muted-foreground">{relative(c.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Engine;
