import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Building2, FileText, Compass, LayoutDashboard, Globe, Star, Settings, CreditCard } from 'lucide-react';

type CompanyLite = { id: string; name: string; sector: string; country: string };
type ResourceLite = { id: string; title: string; category: string };

const ROUTES = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'World Monitor', path: '/world-monitor', icon: Globe },
  { label: 'Watchlist', path: '/watchlist', icon: Star },
  { label: 'Resources', path: '/resources', icon: FileText },
  { label: 'Pricing', path: '/pricing', icon: CreditCard },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyLite[]>([]);
  const [resources, setResources] = useState<ResourceLite[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open || companies.length) return;
    (async () => {
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase.from('companies').select('id,name,sector,country').order('scout_score', { ascending: false }).limit(100),
        supabase.from('resources').select('id,title,category').limit(50),
      ]);
      setCompanies((c as CompanyLite[]) ?? []);
      setResources((r as ResourceLite[]) ?? []);
    })();
  }, [open, companies.length]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search companies, resources, pages…  (⌘K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {ROUTES.map((r) => (
            <CommandItem key={r.path} onSelect={() => go(r.path)}>
              <r.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {r.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {companies.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Companies">
              {companies.map((c) => (
                <CommandItem key={c.id} value={`${c.name} ${c.sector} ${c.country}`} onSelect={() => go(`/company/${c.id}`)}>
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{c.sector} · {c.country}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {resources.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Resources">
              {resources.map((r) => (
                <CommandItem key={r.id} value={r.title} onSelect={() => go(`/resources/${r.id}`)}>
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  {r.title}
                  <span className="ml-2 text-xs text-muted-foreground">{r.category}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading="Tip">
          <CommandItem disabled>
            <Compass className="mr-2 h-4 w-4 text-muted-foreground" />
            Press ⌘K / Ctrl+K anywhere to open this palette
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
