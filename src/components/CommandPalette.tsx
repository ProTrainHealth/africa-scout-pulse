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
  CommandShortcut,
} from '@/components/ui/command';
import { Building2, FileText, Compass, LayoutDashboard, Globe, Star, Settings, CreditCard, Clock } from 'lucide-react';

type CompanyLite = { id: string; name: string; sector: string; country: string };
type ResourceLite = { id: string; title: string; category: string };
type RecentItem = { label: string; path: string; sub?: string };

const ROUTES: { label: string; path: string; icon: any; shortcut?: string }[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, shortcut: 'G D' },
  { label: 'World Monitor', path: '/world-monitor', icon: Globe, shortcut: 'G W' },
  { label: 'Watchlist', path: '/watchlist', icon: Star, shortcut: 'G L' },
  { label: 'Resources', path: '/resources', icon: FileText, shortcut: 'G R' },
  { label: 'Pricing', path: '/pricing', icon: CreditCard },
  { label: 'Settings', path: '/settings', icon: Settings },
];

const RECENT_KEY = 'omni-scout:cmdk-recents';
const MAX_RECENTS = 6;

const loadRecents = (): RecentItem[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch { return []; }
};

const saveRecent = (item: RecentItem) => {
  try {
    const cur = loadRecents().filter(r => r.path !== item.path);
    cur.unshift(item);
    localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, MAX_RECENTS)));
  } catch { /* ignore */ }
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyLite[]>([]);
  const [resources, setResources] = useState<ResourceLite[]>([]);
  const [recents, setRecents] = useState<RecentItem[]>([]);
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
    if (!open) return;
    setRecents(loadRecents());
    if (companies.length) return;
    (async () => {
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase.from('companies').select('id,name,sector,country').order('scout_score', { ascending: false }).limit(100),
        supabase.from('resources').select('id,title,category').limit(50),
      ]);
      setCompanies((c as CompanyLite[]) ?? []);
      setResources((r as ResourceLite[]) ?? []);
    })();
  }, [open, companies.length]);

  const go = (item: RecentItem) => {
    saveRecent(item);
    setOpen(false);
    navigate(item.path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search companies, resources, pages…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {recents.length > 0 && (
          <CommandGroup heading="Recent">
            {recents.map((r) => (
              <CommandItem key={`recent-${r.path}`} value={`recent ${r.label} ${r.sub ?? ''}`} onSelect={() => go(r)}>
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{r.label}</span>
                {r.sub && <span className="ml-2 text-xs text-muted-foreground">{r.sub}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />
        <CommandGroup heading="Navigate">
          {ROUTES.map((r) => (
            <CommandItem key={r.path} onSelect={() => go({ label: r.label, path: r.path })}>
              <r.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {r.label}
              {r.shortcut && <CommandShortcut>{r.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        {companies.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Companies">
              {companies.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.sector} ${c.country}`}
                  onSelect={() => go({ label: c.name, path: `/company/${c.id}`, sub: `${c.sector} · ${c.country}` })}
                >
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
                <CommandItem
                  key={r.id}
                  value={r.title}
                  onSelect={() => go({ label: r.title, path: `/resources/${r.id}`, sub: r.category })}
                >
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
            <span>Open anywhere</span>
            <CommandShortcut>⌘K / Ctrl+K</CommandShortcut>
          </CommandItem>
          <CommandItem disabled>
            <Compass className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Navigate · Run · Dismiss</span>
            <CommandShortcut>↑↓ · ↵ · Esc</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
