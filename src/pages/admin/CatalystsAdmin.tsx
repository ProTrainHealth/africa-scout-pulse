import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Pencil, Trash2, ArrowLeft, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

type CatalystRow = {
  id: string;
  company_id: string;
  title: string;
  type: string;
  event_date: string;
  confidence: string;
  signal_type: string;
  notes: string;
  source_url: string;
  created_at: string;
  company_name?: string;
};

type CompanyOption = { id: string; name: string };

const TYPES = ['earnings', 'regulatory', 'operational', 'commercial', 'fundraising', 'macro'];
const SIGNALS = ['positive', 'risk', 'watch', 'neutral'];
const CONFIDENCES = ['high', 'medium', 'speculative'];

const CatalystsAdmin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<CatalystRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CatalystRow | null>(null);

  // Form state
  const [companyId, setCompanyId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('operational');
  const [eventDate, setEventDate] = useState('');
  const [confidence, setConfidence] = useState('medium');
  const [signalType, setSignalType] = useState('neutral');
  const [notes, setNotes] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/');
  }, [authLoading, user, isAdmin, navigate]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: cats }, { data: cos }] = await Promise.all([
      supabase
        .from('catalysts')
        .select('id, company_id, title, type, event_date, confidence, signal_type, notes, source_url, created_at')
        .order('event_date', { ascending: true }),
      supabase.from('companies').select('id, name').order('name'),
    ]);
    const map = new Map((cos ?? []).map((c) => [c.id, c.name]));
    setRows(
      (cats ?? []).map((c) => ({
        ...c,
        company_name: map.get(c.company_id) ?? 'Unknown',
      })) as CatalystRow[]
    );
    setCompanies(cos ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const resetForm = () => {
    setEditing(null);
    setCompanyId('');
    setTitle('');
    setType('operational');
    setEventDate(format(new Date(), 'yyyy-MM-dd'));
    setConfidence('medium');
    setSignalType('neutral');
    setNotes('');
    setSourceUrl('');
  };

  const openCreate = () => {
    resetForm();
    setSheetOpen(true);
  };

  const openEdit = (row: CatalystRow) => {
    setEditing(row);
    setCompanyId(row.company_id);
    setTitle(row.title);
    setType(row.type);
    setEventDate(row.event_date);
    setConfidence(row.confidence);
    setSignalType(row.signal_type);
    setNotes(row.notes ?? '');
    setSourceUrl(row.source_url ?? '');
    setSheetOpen(true);
  };

  const save = async () => {
    if (!companyId || !title || !eventDate) {
      toast({ title: 'Missing fields', description: 'Company, title and event date are required.', variant: 'destructive' });
      return;
    }
    const payload = {
      company_id: companyId,
      title,
      type,
      event_date: eventDate,
      confidence,
      signal_type: signalType,
      notes,
      source_url: sourceUrl,
    };

    const { error } = editing
      ? await supabase.from('catalysts').update(payload).eq('id', editing.id)
      : await supabase.from('catalysts').insert(payload);

    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Catalyst updated' : 'Catalyst created' });
    setSheetOpen(false);
    fetchData();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this catalyst?')) return;
    const { error } = await supabase.from('catalysts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    fetchData();
  };

  if (authLoading) return null;
  if (!user || !isAdmin) return null;

  const upcoming = rows.filter((r) => new Date(r.event_date) >= new Date(new Date().toDateString()));
  const past = rows.filter((r) => new Date(r.event_date) < new Date(new Date().toDateString()));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Admin
            </Link>
            <h1 className="font-display text-2xl font-bold">Catalysts</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New catalyst
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : (
          <>
            <Section title="Upcoming" icon={<Calendar className="h-4 w-4 text-primary" />} rows={upcoming} onEdit={openEdit} onDelete={remove} />
            <Section title="Past" rows={past} onEdit={openEdit} onDelete={remove} muted />
          </>
        )}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editing ? 'Edit catalyst' : 'New catalyst'}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <Field label="Company">
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Event date"><Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></Field>
                <Field label="Type">
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Signal">
                  <Select value={signalType} onValueChange={setSignalType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SIGNALS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Confidence">
                  <Select value={confidence} onValueChange={setConfidence}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONFIDENCES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Source URL"><Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" /></Field>
              <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} /></Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button onClick={save}>{editing ? 'Save changes' : 'Create'}</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
    {children}
  </div>
);

const Section = ({
  title, icon, rows, onEdit, onDelete, muted,
}: {
  title: string; icon?: React.ReactNode; rows: CatalystRow[];
  onEdit: (r: CatalystRow) => void; onDelete: (id: string) => void; muted?: boolean;
}) => (
  <div className="mb-8">
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {icon} {title} <span className="text-xs text-muted-foreground/70">({rows.length})</span>
    </h2>
    {rows.length === 0 ? (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No catalysts.</div>
    ) : (
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.id} className={`glass-card flex items-center gap-3 rounded-lg px-3 py-2.5 ${muted ? 'opacity-70' : ''}`}>
            <span className="text-xs tabular-nums text-muted-foreground w-24">{r.event_date}</span>
            <span className="font-semibold text-sm w-44 truncate">{r.company_name}</span>
            <span className="flex-1 text-xs text-muted-foreground truncate">{r.title}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 w-20">{r.type}</span>
            <Button variant="ghost" size="icon" onClick={() => onEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default CatalystsAdmin;
