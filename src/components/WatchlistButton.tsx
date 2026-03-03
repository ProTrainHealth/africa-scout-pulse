import { useState } from 'react';
import { Star, StarOff, Loader2 } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const WatchlistButton = ({ companyId }: { companyId: string }) => {
  const { user } = useAuth();
  const { isTracked, isFreeAndAtLimit, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [busy, setBusy] = useState(false);
  const [showLimit, setShowLimit] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const tracked = isTracked(companyId);

  const handleClick = async () => {
    if (!user) { navigate('/auth'); return; }
    if (tracked) {
      setBusy(true);
      await removeFromWatchlist(companyId);
      setBusy(false);
      return;
    }
    if (isFreeAndAtLimit) {
      setShowLimit(true);
      return;
    }
    setBusy(true);
    try {
      await addToWatchlist(companyId);
    } catch (err: any) {
      if (err.message?.includes('5 companies')) {
        setShowLimit(true);
      } else {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
    setBusy(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={busy}
        className="rounded p-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        title={tracked ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : tracked ? (
          <Star className="h-4 w-4 fill-primary text-primary" />
        ) : (
          <StarOff className="h-4 w-4" />
        )}
      </button>

      <Dialog open={showLimit} onOpenChange={setShowLimit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Watchlist Limit Reached</DialogTitle>
            <DialogDescription>
              Free plan allows tracking at most 5 companies. Upgrade to Analyst for unlimited tracking.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => { setShowLimit(false); navigate('/pricing?return_to=/dashboard'); }}>
            Upgrade Now
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WatchlistButton;
