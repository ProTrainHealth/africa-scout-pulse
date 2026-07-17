import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Loader2, FileText } from 'lucide-react';

type ResourceRow = {
  id: string;
  title: string;
  category: string;
  tag: string;
  summary: string;
  storage_path: string;
  file_type: string;
  published_at: string;
};

const CATEGORIES = [
  { value: 'deep_dive', label: 'Weekly Deep-Dive' },
  { value: 'sector_thesis', label: 'Sector Thesis' },
  { value: 'phantom_portfolio', label: 'Phantom Portfolio' },
  { value: 'community', label: 'Community' },
];

const AdminResourcesManager = () => {
  const { toast } = useToast();
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('deep_dive');
  const [tag, setTag] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const fetchResources = async () => {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .order('published_at', { ascending: false });
    setResources(((data ?? []) as ResourceRow[]));
    setLoading(false);
  };

  useEffect(() => { fetchResources(); }, []);

  const handleUpload = async () => {
    if (!title || !file) {
      toast({ title: 'Missing fields', description: 'Title and file are required.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const storagePath = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { error: uploadErr } = await supabase.storage
        .from('resources')
        .upload(storagePath, file, { contentType: file.type });

      if (uploadErr) throw new Error(uploadErr.message);

      const { error: insertErr } = await supabase
        .from('resources')
        .insert({
          title,
          summary,
          category,
          tag: tag || category.replace('_', ' '),
          file_type: ext,
          file_url: '', // We use storage_path + signed URLs now
          storage_path: storagePath,
        });

      if (insertErr) throw new Error(insertErr.message);

      toast({ title: 'Resource uploaded' });
      setTitle('');
      setSummary('');
      setTag('');
      setFile(null);
      fetchResources();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleDelete = async (r: ResourceRow) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    if (r.storage_path) {
      await supabase.storage.from('resources').remove([r.storage_path]);
    }
    await supabase.from('resources').delete().eq('id', r.id);
    fetchResources();
    toast({ title: 'Resource deleted' });
  };

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" /> Upload Resource
        </h3>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <textarea
          placeholder="Summary (optional)"
          value={summary}
          onChange={e => setSummary(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex gap-3">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input
            type="text"
            placeholder="Tag (optional)"
            value={tag}
            onChange={e => setTag(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".pdf"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="text-sm text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary"
          />
          <Button onClick={handleUpload} disabled={uploading || !title || !file}>
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : 'Upload'}
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading resources...</div>
      ) : resources.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No resources uploaded yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium w-16">Delete</th>
              </tr>
            </thead>
            <tbody>
              {resources.map(r => (
                <tr key={r.id} className="border-b border-border/30 hover:bg-secondary/30">
                  <td className="px-4 py-3 font-display font-semibold">{r.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.category}</td>
                  <td className="px-4 py-3"><FileText className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(r.published_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(r)} className="rounded p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminResourcesManager;
