import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { SECTORS, COUNTRIES, Sector } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: CompanyRow | null;
  onSaved: () => void;
};

const COUNTRY_CODES: Record<string, string> = {
  Nigeria: 'NG', 'South Africa': 'ZA', Kenya: 'KE', Egypt: 'EG', Morocco: 'MA',
  Ghana: 'GH', Ethiopia: 'ET', Tanzania: 'TZ', Rwanda: 'RW', Senegal: 'SN',
  "Côte d'Ivoire": 'CI', DRC: 'CD', Mozambique: 'MZ', Botswana: 'BW', Namibia: 'NA',
};

const CompanyForm = ({ open, onOpenChange, company, onSaved }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const emptyForm = {
    name: '', sector: SECTORS[0] as string, country: COUNTRIES[0] as string, cash_runway: 0,
    insider_ownership: 0, scout_score: 50, next_catalyst: '', catalyst_date: '',
    institutional_flow: 'neutral', market_cap: '', description: '',
    governance_score: 0, liquidity_score: 0, infrastructure_score: 0,
    regulatory_score: 0, catalyst_score: 0,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name, sector: company.sector as Sector, country: company.country,
        cash_runway: company.cash_runway, insider_ownership: company.insider_ownership,
        scout_score: company.scout_score, next_catalyst: company.next_catalyst,
        catalyst_date: company.catalyst_date, institutional_flow: company.institutional_flow,
        market_cap: company.market_cap, description: company.description,
        governance_score: company.governance_score ?? 0,
        liquidity_score: company.liquidity_score ?? 0,
        infrastructure_score: company.infrastructure_score ?? 0,
        regulatory_score: company.regulatory_score ?? 0,
        catalyst_score: company.catalyst_score ?? 0,
      });
    } else {
      setForm(emptyForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const clamp = (n: any) => Math.min(100, Math.max(0, Number(n) || 0));
    const payload = {
      ...form,
      country_code: COUNTRY_CODES[form.country] || '',
      cash_runway: Number(form.cash_runway),
      insider_ownership: Number(form.insider_ownership),
      scout_score: clamp(form.scout_score),
      governance_score: clamp(form.governance_score),
      liquidity_score: clamp(form.liquidity_score),
      infrastructure_score: clamp(form.infrastructure_score),
      regulatory_score: clamp(form.regulatory_score),
      catalyst_score: clamp(form.catalyst_score),
    };

    try {
      if (company) {
        const { error } = await supabase.from('companies').update(payload).eq('id', company.id);
        if (error) throw error;
        toast({ title: 'Company updated' });
      } else {
        const { error } = await supabase.from('companies').insert(payload);
        if (error) throw error;
        toast({ title: 'Company added' });
      }
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{company ? 'Edit Company' : 'Add Company'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} required maxLength={200} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Sector</Label>
              <select value={form.sector} onChange={(e) => set('sector', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <select value={form.country} onChange={(e) => set('country', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Scout Score (0-100)</Label>
              <Input type="number" min={0} max={100} value={form.scout_score} onChange={(e) => set('scout_score', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cash Runway (mo)</Label>
              <Input type="number" min={0} value={form.cash_runway} onChange={(e) => set('cash_runway', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Insider %</Label>
              <Input type="number" min={0} max={100} value={form.insider_ownership} onChange={(e) => set('insider_ownership', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Market Cap</Label>
              <Input value={form.market_cap} onChange={(e) => set('market_cap', e.target.value)} placeholder="$420M" maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label>Institutional Flow</Label>
              <select value={form.institutional_flow} onChange={(e) => set('institutional_flow', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="inflow">Inflow</option>
                <option value="outflow">Outflow</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Next Catalyst</Label>
              <Input value={form.next_catalyst} onChange={(e) => set('next_catalyst', e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>Catalyst Date</Label>
              <Input type="date" value={form.catalyst_date} onChange={(e) => set('catalyst_date', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={500} rows={3} />
          </div>

          <div className="rounded-lg border border-border/50 p-3 space-y-2">
            <div className="flex items-baseline justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Scout Score Breakdown (G/L/I/R/C)</Label>
              <span className="text-[10px] font-mono text-muted-foreground">weights 25/20/20/20/15</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {([
                ['governance_score', 'G'],
                ['liquidity_score', 'L'],
                ['infrastructure_score', 'I'],
                ['regulatory_score', 'R'],
                ['catalyst_score', 'C'],
              ] as const).map(([k, letter]) => (
                <div key={k} className="space-y-1">
                  <Label className="text-[10px] font-mono text-accent">{letter}</Label>
                  <Input
                    type="number" min={0} max={100}
                    value={(form as any)[k]}
                    onChange={(e) => set(k, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : company ? 'Update Company' : 'Add Company'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyForm;
