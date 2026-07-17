import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, FileText } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Seo from '@/components/Seo';

type Resource = {
  id: string;
  title: string;
  summary: string;
  category: string;
  tag: string;
  file_url: string;
  file_type: string;
  published_at: string;
  storage_path?: string;
};

const ResourceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!id || !user) return;
    supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        const r = (data ?? null) as Resource | null;
        setResource(r);
        setLoading(false);
        if (r?.storage_path) {
          getSignedUrl(r.storage_path);
        }
      });
  }, [id, user]);

  const getSignedUrl = async (storagePath: string) => {
    setUrlLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('resource-signed-url', {
        body: { storage_path: storagePath },
      });
      if (!error && data?.url) {
        setSignedUrl(data.url);
      }
    } catch (err) {
      console.error('Failed to get signed URL:', err);
    }
    setUrlLoading(false);
  };

  const fileUrl = signedUrl || resource?.file_url || null;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <Skeleton className="h-6 w-32 mb-6" />
          <Skeleton className="h-8 w-96 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-[60vh] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex flex-col items-center justify-center px-4 pt-32 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="font-display text-2xl font-bold">Resource Not Found</h1>
          <Link to="/resources" className="mt-4 text-primary hover:underline">Back to Resources</Link>
        </div>
      </div>
    );
  }

  const desc = (resource.summary || resource.title).slice(0, 158);
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${resource.title.slice(0, 55)} | Omni-Scout`}
        description={desc}
        path={`/resources/${resource.id}`}
        ogType="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: resource.title,
          datePublished: resource.published_at,
          description: desc,
          author: { '@type': 'Organization', name: 'Omni-Scout Africa' },
          publisher: { '@type': 'Organization', name: 'Omni-Scout Africa' },
        }}
      />
      <Navbar />
      <div className="container mx-auto px-4 pb-12 pt-24">
        <Button variant="ghost" onClick={() => navigate('/resources')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Resources
        </Button>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{resource.tag}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(resource.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold">{resource.title}</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">{resource.summary}</p>
        </div>

        {urlLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading document...</span>
          </div>
        ) : fileUrl && resource.file_type === 'pdf' ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <a
                href={fileUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" /> Download PDF
              </a>
            </div>
            <iframe
              src={fileUrl}
              title={resource.title}
              className="w-full rounded-xl border border-border/50"
              style={{ height: '70vh' }}
            />
          </div>
        ) : (
          <div className="glass-card rounded-xl p-8">
            <div className="prose prose-sm max-w-none">
              <p className="text-foreground leading-relaxed">{resource.summary}</p>
              <div className="mt-6 rounded-lg bg-muted/50 p-6 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Full content coming soon. Check back for updates.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceDetail;
