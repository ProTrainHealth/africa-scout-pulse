import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Pencil, Trash2, ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNowStrict } from 'date-fns';

type SignalRow = {
  id: string;
  company_id: string;
  summary: string;
  confidence: string;
  analyst_tag: string;
  is_public: boolean;
  published_at: string;
  created_at: string;
  company_name?: string;
};

type CompanyOption = { id: string; name: string; sector: string; scout_score: number };

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'text-accent',
  medium: 'text-yellow-600',
  speculative: 'text-muted-foreground',
};

const SignalsAdmin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<SignalRow | null>(null);
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'high'>('all');

  // Form state
  const [companyId, setCompanyId] = useState('');
  const [summary, setSummary] = useState('');
  const [confidence, setConfidence] = useState('medium');
  const [analystTag, setAnalystTag] = useState('omni-scout-africa');
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/');
  }, [authLoading, user, isAdmin, navigate]);

  const fetchSignals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('signals')
      .select('id, company_id, summary, confidence, analyst_tag, is_public, published_at, created_at')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const cids = [...new Set(data.map((s) => s.company_id))];
      const { data: comps } = await supabase.from('companies').select('id, name').in('id', cids);
      const nameMap = new Map((comps ?? []).map((c) => [c.id, c.name]));
      setSignals(data.map((s) => ({ ...s, company_name: nameMap.get(s.company_id) ?? 'Unknown' })));
    } else {
      setSignals([]);
    }
    setLoading(false);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name, sector, scout_score').order('scout_score', { ascending: false });
    setCompanies((data as CompanyOption[]) ?? []);
  };

  useEffect(() => {
    if (user && isAdmin) { fetchSignals(); fetchCompanies(); }
  }, [user, isAdmin]);

  const openAdd = () => {
    setEditing(null);
    setCompanyId(''); setSummary(''); setConfidence('medium'); setAnalystTag('omni-scout-africa'); setIsPublic(false);
    setSheetOpen(true);
  };

  const openEdit = (s: SignalRow) => {
    setEditing(s);
    setCompanyId(s.company_id); setSummary(s.summary); setConfidence(s.confidence);
    setAnalystTag(s.analyst_tag); setIsPublic(s.is_public);
    setSheetOpen(true);
  };

  const handleSave = async (publish: boolean) => {
    const payload = {
      company_id: companyId,
      summary,
      confidence,
      analyst_tag: analystTag,
      is_public: publish || isPublic,
      published_at: (publish || isPublic) ? new Date().toISOString() : null,
    };

    if (editing) {
      const { error } = await supabase.from('signals').update(payload).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: publish ? 'Signal published' : 'Signal updated' });
    } else {
      const { error } = await supabase.from('signals').insert([payload]);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: publish ? 'Signal published' : 'Signal saved as draft' });
    }
    setSheetOpen(false);
    fetchSignals();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this signal? This cannot be undone.')) return;
    const { error } = await supabase.from('signals').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Signal deleted' });
    fetchSignals();
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    await supabase.from('signals').update({
      is_public: !current,
      published_at: !current ? new Date().toISOString() : null,
    }).eq('id', id);
    fetchSignals();
  };

  const filtered = signals.filter((s) => {
    if (filter === 'public') return s.is_public;
    if (filter === 'private') return !s.is_public;
    if (filter === 'high') return s.confidence === 'high';
    return true;
  });

  const publicCount = signals.filter((s) => s.is_public).length;
  const privateCount = signals.filter((s) => !s.is_public).length;

  if (authLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-semibold">Signal Management</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
            <Link to="/admin/regime" className="text-muted-foreground hover:text-foreground">Regime</Link>
            <Link to="/admin/macro" className="text-muted-foreground hover:text-foreground">Macro</Link>
            <Link to="/" className="text-muted-foreground hover:text-foreground">← App</Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Signal Management</h1>
            <p className="text-sm text-muted-foreground">{signals.length} signals · {publicCount} public · {privateCount} private</p>
          </div>
          <Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" /> Create Signal</Button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-2 flex-wrap">
          {(['all', 'public', 'private', 'high'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'high' ? 'High Confidence' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Summary</th>
                  <th className="px-4 py-3 font-medium">Confidence</th>
                  <th className="px-4 py-3 font-medium">Analyst</th>
                  <th className="px-4 py-3 font-medium">Public</th>
                  <th className="px-4 py-3 font-medium">Published</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const confStyle = CONFIDENCE_STYLES[s.confidence] ?? CONFIDENCE_STYLES.medium;
                  return (
                    <tr key={s.id} className="border-b border-border/30 transition-colors hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium">{s.company_name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[240px] truncate" title={s.summary}>{s.summary}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold uppercase ${confStyle}`}>{s.confidence}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{s.analyst_tag}</td>
                      <td className="px-4 py-3">
                        <Switch checked={s.is_public} onCheckedChange={() => toggleVisibility(s.id, s.is_public)} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {s.is_public && s.published_at
                          ? formatDistanceToNowStrict(new Date(s.published_at), { addSuffix: true })
                          : 'Draft'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">No signals found.</div>
            )}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Signal' : 'Create Signal'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Company</label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} · {c.sector} · Score {c.scout_score}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Confidence</label>
              <Select value={confidence} onValueChange={setConfidence}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High — verified catalyst</SelectItem>
                  <SelectItem value="medium">Medium — monitor closely</SelectItem>
                  <SelectItem value="speculative">Speculative — hypothesis only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Summary</label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value.slice(0, 500))}
                rows={5}
                placeholder="Describe the signal, catalyst, and investment thesis..."
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{summary.length}/500</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Analyst Tag</label>
              <Input value={analystTag} onChange={(e) => setAnalystTag(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Make public</p>
                {isPublic && <p className="text-[10px] text-amber-500">Visible to all Analyst and Boardroom subscribers.</p>}
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={() => handleSave(false)}>Save Draft</Button>
              <Button className="flex-1" onClick={() => handleSave(true)}>Save & Publish</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SignalsAdmin;
