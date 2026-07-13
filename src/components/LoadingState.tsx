import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState = ({ label = 'Loading…', className = '' }: LoadingStateProps) => (
  <div className={`flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground ${className}`}>
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>{label}</span>
  </div>
);

interface ErrorStateProps {
  error: Error | string | null;
  onRetry?: () => void;
  label?: string;
}

export const ErrorState = ({ error, onRetry, label = 'Failed to load' }: ErrorStateProps) => (
  <div className="glass-card flex flex-col items-center gap-3 rounded-xl p-6 text-center">
    <AlertCircle className="h-6 w-6 text-destructive" />
    <div>
      <div className="font-medium">{label}</div>
      <div className="text-xs text-muted-foreground mt-1">
        {typeof error === 'string' ? error : error?.message || 'Please try again.'}
      </div>
    </div>
    {onRetry && (
      <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
    )}
  </div>
);

export const SkeletonGrid = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className="h-32 w-full rounded-xl" />
    ))}
  </div>
);
