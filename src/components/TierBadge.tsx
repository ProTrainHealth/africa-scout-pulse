import { Eye, BarChart3, Lock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

/**
 * Compact badge showing the signed-in user's current tier.
 * Observer (free) is the fallback when no active paid subscription exists.
 */
const TierBadge = ({ className = '' }: { className?: string }) => {
  const { isActive, plan, loading } = useSubscription();

  if (loading) return null;

  const tier = isActive && plan ? plan : 'observer';
  const config = {
    observer: { label: 'Observer', Icon: Eye },
    analyst: { label: 'Analyst', Icon: BarChart3 },
    boardroom: { label: 'Boardroom', Icon: Lock },
  }[tier];

  const { label, Icon } = config;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-primary ${className}`}
      title={`Current plan: ${label}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
};

export default TierBadge;
