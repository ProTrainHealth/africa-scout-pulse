import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mic, Lock, Search, PhoneCall, Video, MessageSquare, Calendar, Filter } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import AnalystQuestionThread from '@/components/AnalystQuestionThread';

type BriefingType = 'voice_note' | 'management_call' | 'video_boardroom';

interface Briefing {
  id: string;
  title: string;
  storage_path: string;
  transcript: string;
  briefing_date: string;
  duration_seconds: number;
  type: BriefingType;
  video_url: string;
}

const SECTIONS: { key: BriefingType; label: string; icon: typeof Mic; description: string }[] = [
  { key: 'voice_note', label: 'Private voice notes', icon: Mic, description: 'Analyst audio briefings with full searchable transcripts.' },
  { key: 'management_call', label: 'Management call summaries', icon: PhoneCall, description: 'Notes and recordings from management Q&A sessions.' },
  { key: 'video_boardroom', label: 'Monthly video boardroom', icon: Video, description: 'Monthly long-form video sessions, Boardroom-only.' },
];

const Briefings = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const { plan, isActive, loading: subLoading } = useSubscription();
  const [items, setItems] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const typeFilter = (params.get('type') ?? 'all') as 'all' | BriefingType;
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const hasAccess = isAdmin || (isActive && plan === 'boardroom');

  useEffect(() => { document.title = 'Briefings — Omni-Scout Africa'; }, []);

  useEffect(() => {
    if (!hasAccess) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('briefings')
        .select('*')
        .order('briefing_date', { ascending: false });
      if (cancelled) return;
      if (!error && data) {
        setItems(data as Briefing[]);
        const urls: Record<string, string> = {};
        await Promise.all(
          (data as Briefing[]).slice(0, 12).map(async (b) => {
            if (!b.storage_path) return;
            const { data: s } = await supabase.storage
              .from('briefings')
              .createSignedUrl(b.storage_path, 300);
            if (s?.signedUrl) urls[b.id] = s.signedUrl;
          }),
        );
        if (!cancelled) setSignedUrls(urls);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [hasAccess]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((b) => {
      if (typeFilter !== 'all' && b.type !== typeFilter) return false;
      if (from && b.briefing_date < from) return false;
      if (to && b.briefing_date > to) return false;
      if (t && !b.title.toLowerCase().includes(t) && !b.transcript.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [items, q, typeFilter, from, to]);

  const grouped = useMemo(() => {
    const map: Record<BriefingType, Briefing[]> = { voice_note: [], management_call: [], video_boardroom: [] };
    for (const b of filtered) {
      const t = (b.type ?? 'voice_note') as BriefingType;
      if (map[t]) map[t].push(b);
    }
    return map;
  }, [filtered]);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24"><Skeleton className="h-7 w-64 mb-4" /><Skeleton className="h-64 w-full" /></div>
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
          <h1 className="font-display text-2xl font-bold">Briefings — Boardroom Only</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Private voice notes, management call summaries, monthly video boardroom, and direct analyst access are reserved for the Boardroom tier (limited to 50 seats).
          </p>
          <Button onClick={() => navigate('/pricing?return_to=/briefings')} className="mt-6" size="lg">
            Upgrade to Boardroom
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" /> Boardroom Archive
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Voice notes, management calls, and the monthly video boardroom.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-6">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder='Search transcripts — "Dangote March"…'
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setParam('type', v === 'all' ? '' : v)}>
            <SelectTrigger><Filter className="h-3.5 w-3.5 mr-2" /><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="voice_note">Voice notes</SelectItem>
              <SelectItem value="management_call">Management calls</SelectItem>
              <SelectItem value="video_boardroom">Video boardroom</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1 items-center">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Input type="date" value={from} onChange={(e) => setParam('from', e.target.value)} className="px-2 text-xs" aria-label="From date" />
            <Input type="date" value={to} onChange={(e) => setParam('to', e.target.value)} className="px-2 text-xs" aria-label="To date" />
          </div>
        </div>

        {/* Direct Analyst Access */}
        <div className="glass-card rounded-xl p-5 mb-8 border-primary/30">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold">Direct analyst access</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Submit a private question. We reply within one business day.
              </p>
            </div>
          </div>
          <AnalystQuestionThread />
        </div>

        {loading ? (
          <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            {(q || typeFilter !== 'all' || from || to) ? 'No briefings match your filters.' : 'No briefings published yet.'}
          </div>
        ) : (
          <div className="space-y-10">
            {SECTIONS.map(({ key, label, icon: Icon, description }) => {
              const list = grouped[key];
              if (!list.length) return null;
              return (
                <section key={key}>
                  <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-border/30 pb-2">
                    <h2 className="font-display font-bold text-sm flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" /> {label}
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{list.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{description}</p>
                  <ul className="space-y-4">
                    {list.map((b) => (
                      <li key={b.id} className="glass-card rounded-xl p-5">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="font-display font-bold text-base">{b.title}</h3>
                          <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">{b.briefing_date}</span>
                        </div>
                        {b.type === 'video_boardroom' && b.video_url && hasAccess && (
                          <a
                            href={b.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                          >
                            <Video className="h-3.5 w-3.5" /> Watch recording
                          </a>
                        )}
                        {b.type === 'video_boardroom' && b.video_url && !hasAccess && (
                          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Lock className="h-3 w-3" /> Boardroom only
                          </div>
                        )}
                        {b.type !== 'video_boardroom' && signedUrls[b.id] && (
                          <audio controls preload="none" className="mt-3 w-full" src={signedUrls[b.id]} />
                        )}
                        {b.transcript && (
                          <details className="mt-3 group">
                            <summary className="cursor-pointer text-[11px] font-mono uppercase tracking-wider text-primary hover:underline">
                              {b.type === 'management_call' ? 'Call summary' : 'Transcript'}
                            </summary>
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {b.transcript}
                            </p>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-center">
          Signed URLs · 5-minute TTL · not redistributable
        </p>
      </main>
    </div>
  );
};

export default Briefings;
