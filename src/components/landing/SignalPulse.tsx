import { useState, useEffect } from 'react';
import { Lock, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { formatDistanceToNowStrict } from 'date-fns';

type Signal = {
  id: string;
  summary: string;
  confidence: string;
  analyst_tag: string;
  is_public: boolean;
  published_at: string;
  company_name: string;
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-accent/15 text-accent',
  medium: 'bg-primary/15 text-primary',
  speculative: 'bg-purple-500/15 text-purple-400',
};

const SignalPulse = () => {
  const { user, isAdmin } = useAuth();
  const { plan } = useSubscription();
  const [signals, setSignals] = useState<Signal[] | null>(null);

  const canSeePrivate = isAdmin || plan === 'analyst' || plan === 'boardroom';

  useEffect(() => {
    const load = async () => {
      // Public users only see is_public signals via RLS
      const { data } = await supabase
        .from('signals')
        .select('id, summary, confidence, analyst_tag, is_public, published_at, company_id')
        .order('published_at', { ascending: false })
        .limit(12);

      if (!data || data.length === 0) { setSignals([]); return; }

      const companyIds = [...new Set(data.map((s) => s.company_id))];
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);

      const nameMap = new Map((companies ?? []).map((c) => [c.id, c.name]));

      setSignals(
        data.map((s) => ({
          id: s.id,
          summary: s.summary,
          confidence: s.confidence,
          analyst_tag: s.analyst_tag,
          is_public: s.is_public,
          published_at: s.published_at,
          company_name: nameMap.get(s.company_id) ?? 'Unknown',
        }))
      );
    };

    load();

    const channel = supabase
      .channel('signals-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals' }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (signals !== null && signals.length === 0) return null;
  if (signals === null) return null;

  return (
    <div className="overflow-hidden border-b border-border/30 bg-card/50 py-3">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-2">
          <Radio className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Signal Pulse</span>
          <span className="text-[10px] text-muted-foreground">— Signals not noise</span>
        </div>
      </div>
      <div className="overflow-hidden">
        <div
          className="flex animate-ticker hover:[animation-play-state:paused]"
          style={{ width: 'max-content', animationDuration: `${signals.length * 6}s` }}
        >
          {[...signals, ...signals].map((s, i) => {
            const confStyle = CONFIDENCE_STYLES[s.confidence] ?? CONFIDENCE_STYLES.medium;
            return (
              <span
                key={`${s.id}-${i}`}
                className="mx-4 inline-flex items-center gap-2 text-xs whitespace-nowrap"
              >
                {!s.is_public && !canSeePrivate ? (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                ) : null}
                <span className="font-semibold text-foreground">{s.company_name}</span>
                <span className="text-muted-foreground max-w-[200px] truncate">
                  {s.summary}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${confStyle}`}>
                  {s.confidence}
                </span>
                <span className="text-muted-foreground/50 text-[10px]">
                  {s.analyst_tag} · {formatDistanceToNowStrict(new Date(s.published_at), { addSuffix: true })}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SignalPulse;
