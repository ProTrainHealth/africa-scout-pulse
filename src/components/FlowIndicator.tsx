import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const FlowIndicator = ({ flow }: { flow: 'inflow' | 'outflow' | 'neutral' }) => {
  if (flow === 'inflow') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-score-high">
        <TrendingUp className="h-3 w-3" /> Inflow
      </span>
    );
  }
  if (flow === 'outflow') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-score-low">
        <TrendingDown className="h-3 w-3" /> Outflow
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Minus className="h-3 w-3" /> Neutral
    </span>
  );
};

export default FlowIndicator;
