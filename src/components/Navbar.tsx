import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, BarChart3, BookOpen, Globe, Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: BarChart3 },
  { label: 'Resources', to: '/resources', icon: BookOpen },
  { label: 'Pricing', to: '/pricing' },
  { label: 'World Monitor', to: '/world-monitor', icon: Globe },
];

const Navbar = () => {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const isActivePath = (path: string) => location.pathname === path;

  const linkCls = (path: string) =>
    `text-sm font-medium transition-colors ${
      isActivePath(path)
        ? 'text-primary'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  const Links = ({ onNav }: { onNav?: () => void }) => (
    <>
      {NAV_ITEMS.map((item) => (
        <Link key={item.to} to={item.to} className={linkCls(item.to)} onClick={onNav}>
          {item.label}
        </Link>
      ))}
      {isAdmin && (
        <>
          <Link to="/admin/regime" className={linkCls('/admin/regime')} onClick={onNav}>Regime</Link>
          <Link to="/admin/signals" className={linkCls('/admin/signals')} onClick={onNav}>Signals</Link>
        </>
      )}
    </>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 glow-brand">
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-display text-base font-bold tracking-tight">
            <span className="text-gradient-brand">OMNI-SCOUT</span>
          </span>
        </Link>

        {isMobile ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="rounded-md p-2 text-muted-foreground hover:text-foreground" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex flex-col gap-4 p-6 pt-14">
                <Links onNav={() => setOpen(false)} />
                <hr className="border-border/50" />
                {user ? (
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                    <button onClick={() => { signOut(); setOpen(false); }} aria-label="Sign out" className="ml-auto text-muted-foreground hover:text-foreground">
                      <LogOut className="h-3.5 w-3.5" />
                      <span className="sr-only">Sign out</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Sign In</Link>
                    <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground" onClick={() => setOpen(false)}>Start Free</Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <div className="flex items-center gap-6">
            <Links />
            {user ? (
              <div className="flex items-center gap-2 rounded-md border border-border/50 bg-secondary/50 px-3 py-1.5">
                <span className="max-w-[100px] truncate text-xs text-muted-foreground">{user.email}</span>
                <button onClick={signOut} aria-label="Sign out" className="text-muted-foreground hover:text-foreground" title="Sign out">
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="sr-only">Sign out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign In</Link>
                <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                  Start Free
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
