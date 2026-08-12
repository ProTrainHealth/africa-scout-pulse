import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Globe, Star, BookOpen, Settings2,
  LogOut, Menu, Activity, Radio, LineChart,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

export const SIDEBAR_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Companies', to: '/companies', icon: Building2 },
  { label: 'World Monitor', to: '/world-monitor', icon: Globe },
  { label: 'Watchlist', to: '/watchlist', icon: Star },
  { label: 'Portfolio', to: '/portfolio', icon: LineChart },
  { label: 'Boardroom', to: '/boardroom', icon: Radio },
  { label: 'Resources', to: '/resources', icon: BookOpen },
  { label: 'Settings', to: '/settings', icon: Settings2 },
];

const tierLabel = (plan: string | null) => {
  if (plan === 'analyst') return 'ANALYST';
  if (plan === 'boardroom') return 'BOARDROOM';
  return 'OBSERVER';
};

const navClasses = (isActive: boolean) =>
  `flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'border-primary/50 bg-primary/10 text-primary font-medium glow-brand'
      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60'
  }`;

const SidebarNav = ({
  expanded,
  onNavigate,
}: { expanded: boolean; onNavigate?: () => void }) => (
  <nav className="flex-1 py-3 px-2 space-y-0.5">
    {SIDEBAR_ITEMS.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={({ isActive }) => navClasses(isActive)}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {expanded && <span>{item.label}</span>}
      </NavLink>
    ))}
  </nav>
);

const DashboardLayout = () => {
  const { signOut } = useAuth();
  const { plan } = useSubscription();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const tier = tierLabel(plan);

  const Footer = ({ expanded }: { expanded: boolean }) => (
    <div className="border-t border-border/40 p-3 space-y-2">
      {expanded ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Current Tier</div>
          <div className="font-display text-sm font-bold text-primary mt-0.5">{tier}</div>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-primary/30 bg-primary/5 py-2 text-[10px] font-bold text-primary" title={tier}>
          {tier[0]}
        </div>
      )}
      <button
        onClick={signOut}
        aria-label="Sign out"
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {expanded ? <span>Logout</span> : <span className="sr-only">Sign out</span>}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-60' : 'w-16'} hidden md:flex flex-col border-r border-border/40 bg-card/40 transition-all duration-200 shrink-0`}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-4 border-b border-border/40">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 glow-brand">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            {sidebarOpen && (
              <span className="font-display text-sm font-bold tracking-tight truncate">
                <span className="text-gradient-brand">OMNI-SCOUT</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
        <SidebarNav expanded={sidebarOpen} />
        <Footer expanded={sidebarOpen} />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header + sheet */}
        <header className="md:hidden flex h-14 items-center gap-2 border-b border-border/40 bg-card/40 px-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="rounded-md p-2 text-muted-foreground hover:text-foreground" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col pt-12">
                <SidebarNav expanded onNavigate={() => setMobileOpen(false)} />
                <Footer expanded />
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-bold text-gradient-brand">OMNI-SCOUT</span>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
