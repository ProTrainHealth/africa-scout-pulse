const ScoutScoreBar = ({ score }: { score: number }) => {
  const getColor = () => {
    if (score >= 80) return 'bg-score-high';
    if (score >= 60) return 'bg-score-mid';
    return 'bg-score-low';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all ${getColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-semibold font-display ${
        score >= 80 ? 'text-score-high' : score >= 60 ? 'text-score-mid' : 'text-score-low'
      }`}>
        {score}
      </span>
    </div>
  );
};

export default ScoutScoreBar;
