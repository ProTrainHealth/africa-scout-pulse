import { Link, useLocation } from 'react-router-dom';
import { Activity, BarChart3, Shield } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

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

        <div className="flex items-center gap-1">
          <Link
            to="/"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive('/') ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Home
          </Link>
          <Link
            to="/dashboard"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive('/dashboard') ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            to="/dashboard"
            className="ml-2 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Shield className="h-4 w-4" />
            Get Access
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
