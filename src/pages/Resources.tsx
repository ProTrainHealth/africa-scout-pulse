import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { BookOpen, FileText, TrendingUp, Users, Download, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type Resource = {
  id: string;
  title: string;
  summary: string;
  category: string;
  tag: string;
  file_url: string;
  file_type: string;
  published_at: string;
};

const categoryMeta: Record<string, { title: string; icon: any; description: string }> = {
  deep_dive: { title: 'Weekly Deep-Dive Reports', icon: FileText, description: 'In-depth analysis of key companies and market movements across Africa.' },
  sector_thesis: { title: 'Sector Thesis Publications', icon: BookOpen, description: "Macro-level narratives on sectors shaping Africa's infrastructure future." },
  phantom_portfolio: { title: 'Public Phantom Portfolio', icon: TrendingUp, description: 'Hypothetical portfolio tracking — zero real positions. Pure signal.' },
  community: { title: 'Community', icon: Users, description: "Connect with fellow observers tracking Africa's next 50." },
};

const categoryOrder = ['deep_dive', 'sector_thesis', 'phantom_portfolio', 'community'];

const Resources = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('resources')
      .select('*')
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setResources((data as unknown as Resource[]) || []);
        setLoading(false);
      });
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pb-12 pt-24">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72 mb-8" />
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-6 w-56 mb-3" />
                <div className="grid gap-3 md:grid-cols-2">
                  {[...Array(2)].map((_, j) => <Skeleton key={j} className="h-24 rounded-xl" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const grouped = categoryOrder
    .map(cat => ({
      category: cat,
      meta: categoryMeta[cat],
      items: resources.filter(r => r.category === cat),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pb-12 pt-24">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Resources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Deep dives, sector theses, and narrative intelligence — free for all members.
          </p>
        </div>

        <div className="space-y-10">
          {grouped.map(({ category, meta, items }) => (
            <div key={category}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <meta.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">{meta.title}</h2>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card rounded-xl p-4 transition-colors hover:bg-secondary/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-sm font-semibold leading-tight">{item.title}</h3>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {item.tag}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <div className="flex gap-2">
                        <Link
                          to={`/resources/${item.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" /> Open
                        </Link>
                        {item.file_type === 'pdf' && item.file_url && (
                          <a
                            href={item.file_url}
                            download
                            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Download className="h-3 w-3" /> Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Resources;
