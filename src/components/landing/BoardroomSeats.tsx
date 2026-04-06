const TOTAL = 50;
const FILLED = 47;

const BoardroomSeats = () => {
  const remaining = TOTAL - FILLED;
  const pct = (FILLED / TOTAL) * 100;

  return (
    <div className="mt-4 space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-mono text-primary font-semibold">{FILLED}/{TOTAL} seats filled</span>
        <span className="text-destructive font-medium">{remaining} left</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default BoardroomSeats;
