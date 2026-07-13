import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNowStrict } from 'date-fns';

type CatalystEntry = {
  id: string;
  title: string;
  type: string;
  signal_type: string;
  event_date: string;
  created_at: string;
  confidence: string;
  company: { id: string; name: string; country: string; country_code: string };
};

const SIGNAL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  positive: { bg: 'bg-accent/15', text: 'text-accent', label: 'Positive' },
  risk: { bg: 'bg-destructive/15', text: 'text-destructive', label: 'Risk' },
  watch: { bg: 'bg-primary/15', text: 'text-primary', label: 'Watch' },
  neutral: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Neutral' },
};

const COUNTRY_FLAGS: Record<string, string> = {
  Nigeria: '🇳🇬', 'South Africa': '🇿🇦', Kenya: '🇰🇪', Egypt: '🇪🇬', Morocco: '🇲🇦',
  Ghana: '🇬🇭', Ethiopia: '🇪🇹', Tanzania: '🇹🇿', Rwanda: '🇷🇼', "Côte d'Ivoire": '🇨🇮',
  Senegal: '🇸🇳', DRC: '🇨🇩', Mozambique: '🇲🇿', Angola: '🇦🇴', Zambia: '🇿🇲',
};

const CatalystFeed = () => {
  const { isAdmin } = useAuth();
  const { plan } = useSubscription();
  const [catalysts, setCatalysts] = useState<CatalystEntry[] | null>(null);

  const canSeeDetails = isAdmin || plan === 'analyst' || plan === 'boardroom';

  const fetchCatalysts = async () => {
    const { data } = await supabase
      .from('catalysts')
      .select('id, title, type, signal_type, event_date, confidence, company_id, created_at')
      .order('created_at', { ascending: false })
      .limit(8);

    if (!data || data.length === 0) { setCatalysts([]); return; }

    const companyIds = [...new Set(data.map((c) => c.company_id))];
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, country, country_code')
      .in('id', companyIds);

    const companyMap = new Map((companies ?? []).map((c) => [c.id, c]));

    setCatalysts(
      data.map((c) => ({
        ...c,
        signal_type: c.signal_type ?? 'neutral',
        company: companyMap.get(c.company_id) ?? { id: c.company_id, name: 'Unknown', country: '', country_code: '' },
      }))
    );
  };

  useEffect(() => {
    fetchCatalysts();

    const channel = supabase
      .channel('catalysts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catalysts' }, () => {
        fetchCatalysts();
      })
      .subscribe();

    const interval = setInterval(fetchCatalysts, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  if (catalysts !== null && catalysts.length === 0) return null;

  const tickerItems = catalysts?.slice(0, 3) ?? [];

  return (
    <section className="border-t border-border/50 py-0">
      {/* Headline Wire Ticker */}
      {tickerItems.length > 0 && (
        <div className="overflow-hidden border-b border-border/30 bg-muted/50 py-2">
          <div className="flex animate-ticker hover:[animation-play-state:paused]" style={{ width: 'max-content' }}>
            {[...tickerItems, ...tickerItems, ...tickerItems].map((c, i) => {
              const signal = SIGNAL_COLORS[c.signal_type] ?? SIGNAL_COLORS.neutral;
              return (
                <span key={`${c.id}-${i}`} className="mx-6 inline-flex items-center gap-2 text-xs whitespace-nowrap">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${signal.bg.replace('/15', '')}`} />
                  <span className="font-semibold text-foreground">{c.company.name}</span>
                  <span className="text-muted-foreground">{c.title.slice(0, 60)}{c.title.length > 60 ? '…' : ''}</span>
                  <span className="text-muted-foreground/60">
                    {formatDistanceToNowStrict(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
              <Zap className="h-3 w-3" />
              Live Intel
            </div>
            <h2 className="font-display text-2xl font-bold">Catalyst Feed</h2>
          </div>
          <Link
            to="/dashboard"
            className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
          >
            Full Calendar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="space-y-1.5">
          {catalysts === null
            ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
            : catalysts.map((c, i) => {
                const signal = SIGNAL_COLORS[c.signal_type] ?? SIGNAL_COLORS.neutral;
                const flag = COUNTRY_FLAGS[c.company.country] ?? '🌍';
                return (
                  <div
                    key={c.id}
                    className="glass-card relative flex items-center gap-3 rounded-lg px-4 py-3 animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {/* Signal badge */}
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${signal.bg} ${signal.text}`}>
                      {signal.label}
                    </span>

                    {/* Company */}
                    <span className="font-display text-sm font-semibold shrink-0">{c.company.name}</span>

                    {/* Title */}
                    <span className={`flex-1 truncate text-xs ${canSeeDetails ? 'text-muted-foreground' : 'text-muted-foreground blur-sm select-none'}`}>
                      {c.title}
                    </span>

                    {/* Meta */}
                    <span className="shrink-0 text-sm" title={c.company.country}>{flag}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums w-14 text-right">
                      {formatDistanceToNowStrict(new Date(c.created_at), { addSuffix: false })}
                    </span>

                    {/* Lock overlay */}
                    {!canSeeDetails && (
                      <div className="absolute inset-0 flex items-center justify-end rounded-lg bg-background/50 backdrop-blur-[1px] pr-4">
                        <Link
                          to="/pricing"
                          className="inline-flex items-center gap-1.5 rounded bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          <Lock className="h-2.5 w-2.5" />
                          Unlock with Analyst
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
        </div>
      </div>
    </section>
  );
};

export default CatalystFeed;
