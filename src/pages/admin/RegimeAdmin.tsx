import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Pencil, ArrowLeft, Shield, Globe, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';

type RegimeRow = {
  id: string;
  country: string;
  flag_emoji: string;
  regime_status: string;
  risk_tag: string;
  updated_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  stable: 'bg-accent/10 text-accent',
  transitioning: 'bg-yellow-500/10 text-yellow-600',
  elevated_risk: 'bg-orange-500/10 text-orange-600',
  critical: 'bg-destructive/10 text-destructive',
};

const RegimeAdmin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [regimes, setRegimes] = useState<RegimeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<RegimeRow | null>(null);

  // Form state
  const [country, setCountry] = useState('');
  const [flagEmoji, setFlagEmoji] = useState('');
  const [status, setStatus] = useState('stable');
  const [riskTag, setRiskTag] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/');
  }, [authLoading, user, isAdmin, navigate]);

  const fetchRegimes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('country_context')
      .select('*')
      .order('country');
    setRegimes((data as RegimeRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (user && isAdmin) fetchRegimes(); }, [user, isAdmin]);

  const openAdd = () => {
    setEditing(null);
    setCountry(''); setFlagEmoji(''); setStatus('stable'); setRiskTag('');
    setSheetOpen(true);
  };

  const openEdit = (r: RegimeRow) => {
    setEditing(r);
    setCountry(r.country);
    setFlagEmoji(r.flag_emoji);
    setStatus(r.regime_status);
    setRiskTag(r.risk_tag);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      country, flag_emoji: flagEmoji, regime_status: status, risk_tag: riskTag,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from('country_context').update(payload).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Country updated' });
    } else {
      const { error } = await supabase.from('country_context').insert([payload]);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Country added' });
    }
    setSheetOpen(false);
    fetchRegimes();
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-semibold">Regime Radar</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
            <Link to="/admin/signals" className="text-muted-foreground hover:text-foreground">Signals</Link>
            <Link to="/admin/macro" className="text-muted-foreground hover:text-foreground">Macro</Link>
            <Link to="/" className="text-muted-foreground hover:text-foreground">← App</Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Regime Radar Management</h1>
            <p className="text-sm text-muted-foreground">{regimes.length} countries</p>
          </div>
          <Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" /> Add Country</Button>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium">Flag</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Risk Tag</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {regimes.map((r) => {
                  const style = STATUS_STYLES[r.regime_status] ?? STATUS_STYLES.stable;
                  return (
                    <tr key={r.id} className="border-b border-border/30 transition-colors hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium">{r.country}</td>
                      <td className="px-4 py-3 text-lg">{r.flag_emoji}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${style}`}>
                          {r.regime_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.risk_tag}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {formatDistanceToNowStrict(new Date(r.updated_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Country' : 'Add Country'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Country Name</label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Flag Emoji</label>
              <Input value={flagEmoji} onChange={(e) => setFlagEmoji(e.target.value)} placeholder="🇿🇦" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Regime Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="transitioning">Transitioning</SelectItem>
                  <SelectItem value="elevated_risk">Elevated Risk</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Risk Tag</label>
              <Input value={riskTag} onChange={(e) => setRiskTag(e.target.value)} placeholder="Currency Controls" />
            </div>
            <Button className="w-full" onClick={handleSave}>
              {editing ? 'Update Country' : 'Add Country'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default RegimeAdmin;
