import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Radio, Send, Users, Video, Mic, FileAudio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import Seo from '@/components/Seo';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type FeedItem = {
  id: string;
  kind: 'signal' | 'briefing';
  title: string;
  body: string;
  tag: string;
  at: string;
};

type PresencePeer = {
  user_id: string;
  label: string;
  role: 'analyst' | 'member';
  online_at: string;
};

const PRESENCE_TOPIC = 'boardroom-presence';

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const Boardroom = () => {
  const { user, isAdmin } = useAuth();
  const { plan, isActive, loading: subLoading } = useSubscription();
  const hasAccess = isAdmin || (isActive && plan === 'boardroom');

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [questions, setQuestions] = useState<
    { id: string; subject: string; body: string; status: string; analyst_response: string; created_at: string }[]
  >([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ---- Feed load + realtime -------------------------------------------------
  useEffect(() => {
    if (!hasAccess) return;
    let active = true;

    const load = async () => {
      const [{ data: signals }, { data: briefings }] = await Promise.all([
        supabase
          .from('signals')
          .select('id, summary, confidence, analyst_tag, published_at')
          .order('published_at', { ascending: false })
          .limit(40),
        supabase
          .from('briefings')
          .select('id, title, transcript, type, briefing_date, created_at')
          .order('created_at', { ascending: false })
          .limit(40),
      ]);
      if (!active) return;
      const items: FeedItem[] = [
        ...(signals ?? []).map((s) => ({
          id: `signal-${s.id}`,
          kind: 'signal' as const,
          title: s.analyst_tag || 'Analyst desk',
          body: s.summary,
          tag: s.confidence,
          at: s.published_at,
        })),
        ...(briefings ?? []).map((b) => ({
          id: `briefing-${b.id}`,
          kind: 'briefing' as const,
          title: b.title,
          body: b.transcript,
          tag: b.type,
          at: b.created_at,
        })),
      ].sort((a, b) => a.at.localeCompare(b.at));
      setFeed(items);
      setFeedLoading(false);
    };
    load();

    const channel = supabase
      .channel('boardroom-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'briefings' }, load)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [hasAccess]);

  // ---- Presence -------------------------------------------------------------
  useEffect(() => {
    if (!hasAccess || !user) return;
    const label = user.email?.split('@')[0] ?? 'member';
    const channel = supabase.channel(PRESENCE_TOPIC, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresencePeer>();
        const list = Object.values(state)
          .flat()
          .filter((p): p is PresencePeer & { presence_ref: string } => !!p && 'user_id' in p);
        setPeers(list.map(({ user_id, label, role, online_at }) => ({ user_id, label, role, online_at })));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            label,
            role: isAdmin ? 'analyst' : 'member',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasAccess, user, isAdmin]);

  // ---- Question thread ------------------------------------------------------
  const loadQuestions = async () => {
    const { data } = await supabase
      .from('analyst_questions')
      .select('id, subject, body, status, analyst_response, created_at')
      .order('created_at', { ascending: true });
    setQuestions(data ?? []);
  };

  useEffect(() => {
    if (hasAccess && user) loadQuestions();
  }, [hasAccess, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feed.length, questions.length]);

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim() || !body.trim()) return;
    setSending(true);
    const { error } = await supabase.from('analyst_questions').insert({
      user_id: user.id,
      subject: subject.trim().slice(0, 200),
      body: body.trim().slice(0, 4000),
    });
    setSending(false);
    if (error) {
      toast.error('Could not reach the analyst desk');
      return;
    }
    setSubject('');
    setBody('');
    toast.success('Question sent to the analyst desk');
    loadQuestions();
  };

  const analysts = useMemo(() => peers.filter((p) => p.role === 'analyst'), [peers]);
  const members = useMemo(() => peers.filter((p) => p.role !== 'analyst'), [peers]);

  // ---- Locked state ---------------------------------------------------------
  if (subLoading) return <LoadingState label="Verifying boardroom access…" />;

  if (!hasAccess) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <Seo title="Boardroom — Private Signal Room" description="Private signal room for Boardroom members." path="/boardroom" />
        <div className="max-w-md rounded-2xl border border-primary/30 bg-card/40 p-8 text-center backdrop-blur-xl shadow-[0_0_60px_-25px_hsl(var(--primary))] animate-fade-in">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-display text-xl font-bold">Access Denied — Upgrade Required</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">Boardroom tier only</p>
          <p className="mt-3 text-sm text-muted-foreground">
            The Boardroom is a private signal room limited to 50 seats. It carries private signals, voice notes,
            management calls and direct analyst access.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link to="/pricing?plan=boardroom">View Boardroom pricing</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ---- Terminal -------------------------------------------------------------
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col p-3 md:p-4">
      <Seo title="Boardroom — Private Signal Room" description="Live private signals, briefings and direct analyst access for Boardroom members." path="/boardroom" />

      <header className="mb-3 flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-score-high opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-score-high" />
        </span>
        <h1 className="font-display text-lg font-bold">Boardroom</h1>
        <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
          Live · Private
        </span>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_260px]">
        {/* Feed */}
        <section className="flex min-h-0 flex-col rounded-xl border border-primary/30 bg-card/40 backdrop-blur-sm animate-fade-in">
          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
            <Radio className="h-3.5 w-3.5 text-primary" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Signal tape</h2>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {feedLoading ? (
              <LoadingState label="Opening the tape…" />
            ) : feed.length === 0 ? (
              <p className="py-10 text-center font-mono text-xs text-muted-foreground">No signals published yet.</p>
            ) : (
              feed.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-border/40 bg-background/40 p-3 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
                    <span className="text-muted-foreground">{timeOf(item.at)}</span>
                    {item.kind === 'signal' ? (
                      <span className="text-primary">SIGNAL</span>
                    ) : (
                      <span className="flex items-center gap-1 text-score-high">
                        {item.tag === 'video_boardroom' ? <Video className="h-3 w-3" /> :
                         item.tag === 'voice_note' ? <Mic className="h-3 w-3" /> :
                         <FileAudio className="h-3 w-3" />}
                        {item.tag.replace(/_/g, ' ') || 'BRIEFING'}
                      </span>
                    )}
                    <span className="ml-auto text-muted-foreground">{item.title}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
                    {item.body || 'Not available'}
                  </p>
                </article>
              ))
            )}

            {questions.map((q) => (
              <article key={q.id} className="ml-auto max-w-[85%] rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary">
                  <span>{timeOf(q.created_at)}</span>
                  <span>You → analyst desk</span>
                  <span className="ml-auto text-muted-foreground">{q.status}</span>
                </div>
                <p className="mt-1 text-xs font-semibold">{q.subject}</p>
                <p className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">{q.body}</p>
                {q.analyst_response && (
                  <div className="mt-2 rounded-md border border-border/50 bg-background/60 p-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-score-high">Analyst reply</p>
                    <p className="mt-1 whitespace-pre-wrap font-mono text-xs">{q.analyst_response}</p>
                  </div>
                )}
              </article>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <form
            onSubmit={submitQuestion}
            className="space-y-2 border-t border-border/50 bg-card/60 p-3 backdrop-blur-xl"
          >
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              maxLength={200}
              className="h-8 bg-background/50 font-mono text-xs"
            />
            <div className="flex items-end gap-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ask the analyst desk…"
                rows={2}
                maxLength={4000}
                className="resize-none bg-background/50 font-mono text-xs"
              />
              <Button type="submit" size="sm" disabled={sending || !subject.trim() || !body.trim()} className="gap-1.5">
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </div>
          </form>
        </section>

        {/* Presence sidebar */}
        <aside className="hidden min-h-0 flex-col rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm lg:flex animate-fade-in">
          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Live analysts</h2>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            <div>
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Analysts ({analysts.length})
              </p>
              {analysts.length === 0 ? (
                <p className="font-mono text-[11px] text-muted-foreground">No analyst online</p>
              ) : (
                analysts.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-2 py-1">
                    <span className="h-2 w-2 rounded-full bg-score-high shadow-[0_0_8px_hsl(var(--score-high))]" />
                    <span className="truncate font-mono text-xs">{p.label}</span>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border/40 pt-2">
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Members ({members.length})
              </p>
              {members.map((p) => (
                <div key={p.user_id} className="flex items-center gap-2 py-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
                  <span className="truncate font-mono text-xs text-muted-foreground">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Boardroom;
