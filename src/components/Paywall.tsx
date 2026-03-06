import { useNavigate } from 'react-router-dom';
import { Lock, BarChart3, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Paywall = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 glow-brand">
        <Lock className="h-8 w-8 text-primary" />
      </div>
      <h2 className="font-display text-2xl font-bold">Dashboard Access Required</h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        The Live Intelligence Ledger is available to Analyst and Boardroom subscribers.
        Upgrade to unlock real-time Scout Scores, catalyst tracking, and institutional flow data.
      </p>

      <div className="mx-auto mt-8 grid w-full max-w-2xl gap-4 md:grid-cols-2">
        {/* Analyst */}
        <div className="glass-card rounded-xl border-primary/30 p-6 text-left">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-bold">Analyst</h3>
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-primary">From $139/mo</div>
          <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-primary" /> Live company ledger</li>
            <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-primary" /> Scout Score tracking</li>
            <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-primary" /> Catalyst calendar</li>
            <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-primary" /> Institutional flow data</li>
          </ul>
          <Button
            className="mt-5 w-full"
            onClick={() => navigate('/pricing')}
          >
            Upgrade to Analyst <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {/* Boardroom */}
        <div className="glass-card rounded-xl p-6 text-left">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-bold">Boardroom</h3>
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-primary">From $449/mo</div>
          <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-primary" /> Everything in Analyst</li>
            <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-primary" /> Private signal room</li>
            <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-primary" /> Private voice notes</li>
            <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-primary" /> Monthly video boardroom</li>
            <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-primary" /> Direct analyst access</li>
          </ul>
          <Button
            variant="outline"
            className="mt-5 w-full"
            onClick={() => navigate('/pricing')}
          >
            Upgrade to Boardroom <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Already subscribed? Try refreshing the page. Payments are processed via PayPal.
      </p>
    </div>
  );
};

export default Paywall;
