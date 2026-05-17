import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Mic, Trash2, Upload } from 'lucide-react';

interface Briefing {
  id: string;
  title: string;
  storage_path: string;
  transcript: string;
  briefing_date: string;
  duration_seconds: number;
  company_id: string | null;
}

const AdminBriefingsManager = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('briefings')
      .select('*')
      .order('briefing_date', { ascending: false });
    if (!error && data) setItems(data as Briefing[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast({ title: 'Title and audio file required', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('briefings').upload(path, file);
    if (upErr) {
      toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' });
      setBusy(false);
      return;
    }
    const { error: insErr } = await supabase.from('briefings').insert({
      title: title.trim(),
      storage_path: path,
      transcript: transcript.trim(),
    });
    if (insErr) {
      toast({ title: 'Save failed', description: insErr.message, variant: 'destructive' });
    } else {
      toast({ title: 'Briefing published' });
      setTitle(''); setTranscript(''); setFile(null);
      fetchAll();
    }
    setBusy(false);
  };

  const handleDelete = async (b: Briefing) => {
    if (!confirm('Delete briefing?')) return;
    if (b.storage_path) await supabase.storage.from('briefings').remove([b.storage_path]);
    const { error } = await supabase.from('briefings').delete().eq('id', b.id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-display font-bold">
          <Mic className="h-4 w-4 text-primary" /> New briefing (Boardroom-only)
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dangote March 2026 — Cement margin call" />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">Transcript (optional, paste here for now)</Label>
          <Textarea rows={4} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Searchable transcript..." />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">Audio file (MP3 / M4A / WAV)</Label>
          <Input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <Button onClick={handleUpload} disabled={busy}>
          <Upload className="mr-1 h-4 w-4" /> {busy ? 'Uploading…' : 'Publish briefing'}
        </Button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 text-sm font-display font-bold">
          Published briefings
        </div>
        {loading ? (
          <div className="p-6 text-xs text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">No briefings yet.</div>
        ) : (
          <ul className="divide-y divide-border/30">
            {items.map((b) => (
              <li key={b.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{b.title}</div>
                  <div className="text-[11px] font-mono text-muted-foreground">{b.briefing_date}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(b)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminBriefingsManager;
