import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Lock, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

interface Briefing {
  id: string;
  title: string;
  storage_path: string;
  transcript: string;
  briefing_date: string;
  duration_seconds: number;
}

const Briefings = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const { plan, isActive, loading: subLoading } = useSubscription();
  const [items, setItems] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');

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
        // Sign URLs for the most recent 10
        const urls: Record<string, string> = {};
        await Promise.all(
          (data as Briefing[]).slice(0, 10).map(async (b) => {
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
    if (!q.trim()) return items;
    const t = q.toLowerCase();
    return items.filter((b) => b.title.toLowerCase().includes(t) || b.transcript.toLowerCase().includes(t));
  }, [items, q]);

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
            Audio briefings with searchable transcripts are reserved for the Boardroom tier.
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
              <Mic className="h-5 w-5 text-primary" /> Briefings Archive
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Analyst audio briefings with full searchable transcripts.
            </p>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search transcripts — "Dangote March"…'
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            {q ? 'No briefings match your search.' : 'No briefings published yet.'}
          </div>
        ) : (
          <ul className="space-y-4">
            {filtered.map((b) => (
              <li key={b.id} className="glass-card rounded-xl p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display font-bold text-base">{b.title}</h2>
                  <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">{b.briefing_date}</span>
                </div>
                {signedUrls[b.id] && (
                  <audio controls preload="none" className="mt-3 w-full" src={signedUrls[b.id]} />
                )}
                {b.transcript && (
                  <details className="mt-3 group">
                    <summary className="cursor-pointer text-[11px] font-mono uppercase tracking-wider text-primary hover:underline">
                      Transcript
                    </summary>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {b.transcript}
                    </p>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-center">
          Signed URLs · 5-minute TTL · not redistributable
        </p>
      </main>
    </div>
  );
};

export default Briefings;
