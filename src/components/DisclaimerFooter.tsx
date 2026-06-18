import { Link } from "react-router-dom";

const DisclaimerFooter = () => (
  <footer className="border-t border-border/40 bg-background/80 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
    <div className="container mx-auto flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-3xl">
        <span className="font-medium text-foreground/80">Not investment advice.</span>{" "}
        Research and intelligence only. Africa Scout Pulse holds no trading
        positions and accepts no liability for decisions made using this content.
      </p>
      <div className="flex shrink-0 gap-4">
        <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
        <Link to="/terms" className="hover:text-foreground">Terms</Link>
        <Link to="/transparency" className="hover:text-foreground">Transparency</Link>
      </div>
    </div>
  </footer>
);

export default DisclaimerFooter;
