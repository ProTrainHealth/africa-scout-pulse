import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, BarChart3, Shield, BookOpen, Lock, LogOut, Receipt, User, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

const Navbar = () => {
  const location = useLocation();
  const { user, loading, signOut } = useAuth();
  const { isActive } = useSubscription();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const isActive_ = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive_(path) ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
    }`;

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <Link to="/" className={navLinkClass('/')} onClick={onNavigate}>
        Home
      </Link>

      {user && (
        <Link to="/resources" className={navLinkClass('/resources')} onClick={onNavigate}>
          <BookOpen className="h-4 w-4" />
          Resources
        </Link>
      )}

      <Link to="/dashboard" className={navLinkClass('/dashboard')} onClick={onNavigate}>
        {!isActive && <Lock className="h-3.5 w-3.5" />}
        <BarChart3 className="h-4 w-4" />
        Dashboard
      </Link>

      <Link to="/pricing" className={navLinkClass('/pricing')} onClick={onNavigate}>
        Pricing
      </Link>

      {user ? (
        <>
          <Link to="/orders" className={navLinkClass('/orders')} onClick={onNavigate}>
            <Receipt className="h-4 w-4" />
            Orders
          </Link>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-3 py-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="max-w-[120px] truncate text-xs text-muted-foreground">{user.email}</span>
            <button
              onClick={() => { signOut(); onNavigate?.(); }}
              className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      ) : (
        <Link
          to="/auth"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          onClick={onNavigate}
        >
          <Shield className="h-4 w-4" />
          Get Access
        </Link>
      )}
    </>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 glow-brand">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            <span className="text-gradient-brand">Omni-Scout</span>
            <span className="ml-1 text-muted-foreground font-normal">Africa</span>
          </span>
        </Link>

        {isMobile ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex flex-col gap-1 p-4 pt-12">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <div className="flex items-center gap-1">
            <NavLinks />
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
