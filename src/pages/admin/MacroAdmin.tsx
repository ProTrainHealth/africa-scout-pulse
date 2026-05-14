import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Pencil, ArrowLeft, LineChart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNowStrict } from 'date-fns';

type MacroRow = {
  id: string;
  indicator: string;
  current_value: string;
  trend: 'rising' | 'falling' | 'stable' | 'volatile';
  unit: string | null;
  source: string | null;
  updated_at: string;
};

const TREND_STYLES: Record<string, string> = {
  rising: 'bg-accent/10 text-accent',
  falling: 'bg-destructive/10 text-destructive',
  stable: 'bg-muted text-muted-foreground',
  volatile: 'bg-primary/10 text-primary',
};

const MacroAdmin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<MacroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<MacroRow | null>(null);

  const [indicator, setIndicator] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [trend, setTrend] = useState<MacroRow['trend']>('stable');
  const [unit, setUnit] = useState('');
  const [source, setSource] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/');
  }, [authLoading, user, isAdmin, navigate]);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('macro_indicators')
      .select('*')
      .order('indicator');
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setRows((data as MacroRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && isAdmin) fetchRows();
  }, [user, isAdmin]);

  const openAdd = () => {
    setEditing(null);
    setIndicator('');
    setCurrentValue('');
    setTrend('stable');
    setUnit('');
    setSource('');
    setSheetOpen(true);
  };

  const openEdit = (r: MacroRow) => {
    setEditing(r);
    setIndicator(r.indicator);
    setCurrentValue(r.current_value);
    setTrend(r.trend);
    setUnit(r.unit ?? '');
    setSource(r.source ?? '');
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!indicator.trim() || !currentValue.trim()) {
      toast({ title: 'Indicator and value are required', variant: 'destructive' });
      return;
    }
    const payload = {
      indicator: indicator.trim(),
      current_value: currentValue.trim(),
      trend,
      unit: unit.trim() || null,
      source: source.trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    };
    const { error } = await supabase
      .from('macro_indicators')
      .upsert(payload, { onConflict: 'indicator' });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Indicator updated' : 'Indicator added' });
    setSheetOpen(false);
    fetchRows();
  };

  const handleDelete = async (r: MacroRow) => {
    if (!confirm(`Delete "${r.indicator}"?`)) return;
    const { error } = await supabase.from('macro_indicators').delete().eq('id', r.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Indicator deleted' });
    fetchRows();
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <LineChart className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-semibold">Macro Indicators</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
            <Link to="/admin/regime" className="text-muted-foreground hover:text-foreground">Regime</Link>
            <Link to="/admin/signals" className="text-muted-foreground hover:text-foreground">Signals</Link>
            <Link to="/" className="text-muted-foreground hover:text-foreground">← App</Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Macro Indicators</h1>
            <p className="text-sm text-muted-foreground">{rows.length} indicators tracked</p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="mr-1 h-4 w-4" /> Add Indicator
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Indicator</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Trend</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const style = TREND_STYLES[r.trend] ?? TREND_STYLES.stable;
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border/30 transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3 font-medium">{r.indicator}</td>
                      <td className="px-4 py-3 font-mono tabular-nums">{r.current_value}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${style}`}>
                          {r.trend}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.unit ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.source ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {formatDistanceToNowStrict(new Date(r.updated_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                No indicators yet. Add your first one.
              </div>
            )}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Indicator' : 'Add Indicator'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Indicator name</label>
              <Input
                value={indicator}
                onChange={(e) => setIndicator(e.target.value)}
                placeholder="Pan-African Composite PMI"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Current value</label>
              <Input
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder='51.3 or $93.4B'
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Trend</label>
              <Select value={trend} onValueChange={(v) => setTrend(v as MacroRow['trend'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rising">Rising ↑</SelectItem>
                  <SelectItem value="falling">Falling ↓</SelectItem>
                  <SelectItem value="stable">Stable →</SelectItem>
                  <SelectItem value="volatile">Volatile ↕</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Unit</label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="index, USD, %"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Source</label>
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="IMF WEO 2026"
              />
            </div>
            <Button className="w-full" onClick={handleSave}>
              {editing ? 'Update Indicator' : 'Add Indicator'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MacroAdmin;
