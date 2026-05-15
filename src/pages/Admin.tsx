import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Plus, Pencil, Trash2, LogOut, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import CompanyForm from '@/components/CompanyForm';
import ScoutScoreBar from '@/components/ScoutScoreBar';
import ScoutScoreBreakdown from '@/components/ScoutScoreBreakdown';
import SectorBadge from '@/components/SectorBadge';
import AdminRequestsQueue from '@/components/AdminRequestsQueue';
import AdminResourcesManager from '@/components/AdminResourcesManager';
import type { Sector } from '@/lib/types';

type CompanyRow = {
  id: string;
  name: string;
  sector: string;
  country: string;
  country_code: string;
  cash_runway: number;
  insider_ownership: number;
  scout_score: number;
  next_catalyst: string;
  catalyst_date: string;
  institutional_flow: string;
  market_cap: string;
  description: string;
  governance_score?: number;
  liquidity_score?: number;
  infrastructure_score?: number;
  regulatory_score?: number;
  catalyst_score?: number;
};

const Admin = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const { isActive } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('scout_score', { ascending: false });
    if (!error && data) setCompanies(data);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this company?')) return;
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Company deleted' });
      fetchCompanies();
    }
  };

  const handleEdit = (company: CompanyRow) => {
    setEditingCompany(company);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingCompany(null);
    setFormOpen(true);
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">You don't have admin access.</p>
        <Button variant="outline" onClick={() => { signOut(); navigate('/auth'); }}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-display text-lg font-bold">
              <span className="text-gradient-brand">Analyst</span> Panel
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin/regime" className="hidden sm:inline text-xs text-muted-foreground hover:text-foreground">Regime</a>
            <a href="/admin/signals" className="hidden sm:inline text-xs text-muted-foreground hover:text-foreground">Signals</a>
            <a href="/admin/macro" className="hidden sm:inline text-xs text-muted-foreground hover:text-foreground">Macro</a>
            <span className="hidden sm:inline text-xs text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/auth'); }}>
              <LogOut className="mr-1 h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="companies">
          <TabsList className="mb-6">
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="requests">Feature Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="companies">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{companies.length} companies</p>
              <Button onClick={handleAdd}>
                <Plus className="mr-1 h-4 w-4" /> Add Company
              </Button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading companies...</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/40">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Company</th>
                      <th className="px-4 py-3 font-medium">Sector</th>
                      <th className="px-4 py-3 font-medium">Country</th>
                      <th className="px-4 py-3 font-medium">Scout Score</th>
                      <th className="px-4 py-3 font-medium">Market Cap</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c) => (
                      <tr key={c.id} className="border-b border-border/30 transition-colors hover:bg-secondary/30">
                        <td className="px-4 py-3">
                          <div className="font-display font-semibold">{c.name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{c.description}</div>
                        </td>
                        <td className="px-4 py-3">
                          <SectorBadge sector={c.sector as Sector} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{c.country}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ScoutScoreBar score={c.scout_score} />
                            <ScoutScoreBreakdown
                              score={c.scout_score}
                              parts={{
                                governance: c.governance_score,
                                liquidity: c.liquidity_score,
                                infrastructure: c.infrastructure_score,
                                regulatory: c.regulatory_score,
                                catalyst: c.catalyst_score,
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 font-display font-medium">{c.market_cap}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {companies.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">No companies yet. Add your first one.</div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources">
            <AdminResourcesManager />
          </TabsContent>

          <TabsContent value="requests">
            {(isActive || isAdmin) ? (
              <AdminRequestsQueue />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <Lock className="h-10 w-10 text-muted-foreground" />
                <p className="font-display font-semibold">Paid Plan Required</p>
                <p className="text-sm text-muted-foreground">Upgrade to manage feature requests.</p>
                <Button onClick={() => navigate('/pricing?return_to=/admin')}>
                  View Plans
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CompanyForm
        open={formOpen}
        onOpenChange={setFormOpen}
        company={editingCompany}
        onSaved={fetchCompanies}
      />
    </div>
  );
};

export default Admin;
