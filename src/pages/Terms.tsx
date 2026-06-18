import Seo from "@/components/Seo";

const Terms = () => (
  <main className="container mx-auto max-w-3xl px-4 py-12 text-foreground">
    <Seo
      title="Terms of Service | Africa Scout Pulse"
      description="Terms governing use of the Africa Scout Pulse intelligence platform."
      canonical="/terms"
    />
    <h1 className="font-display text-3xl mb-6">Terms of Service</h1>
    <p className="text-sm text-muted-foreground mb-8">Last updated: June 18, 2026</p>

    <section className="space-y-6 text-sm leading-relaxed">
      <div>
        <h2 className="font-display text-xl mb-2">1. Nature of the service</h2>
        <p>
          Africa Scout Pulse is an intelligence and research terminal covering
          African infrastructure companies. We provide data, scores, and
          commentary for informational purposes only.
        </p>
      </div>

      <div>
        <h2 className="font-display text-xl mb-2">2. Not investment advice</h2>
        <p className="font-medium">
          Nothing on this platform constitutes investment, legal, tax, or
          financial advice. Scout Scores, signals, catalysts, and the Phantom
          Portfolio are research tools — not buy or sell recommendations. We hold
          no trading positions and accept no liability for decisions made using
          this content. Always consult a qualified, licensed advisor before
          allocating capital.
        </p>
      </div>

      <div>
        <h2 className="font-display text-xl mb-2">3. Subscriptions and billing</h2>
        <p>
          Paid plans (Analyst, Boardroom) renew automatically until canceled.
          You may cancel from <a className="underline" href="/settings">Settings</a> at any
          time. No refunds for partial billing periods.
        </p>
      </div>

      <div>
        <h2 className="font-display text-xl mb-2">4. Acceptable use</h2>
        <p>
          No scraping, redistribution, reverse engineering, or resale of platform
          data without a written commercial license. Boardroom seats are limited
          to 50 and may not be shared.
        </p>
      </div>

      <div>
        <h2 className="font-display text-xl mb-2">5. Termination</h2>
        <p>
          We may suspend accounts that violate these terms or applicable law.
          Upon termination, paid features cease at the end of the current
          billing period.
        </p>
      </div>

      <div>
        <h2 className="font-display text-xl mb-2">6. Governing law</h2>
        <p>
          These terms are governed by the laws of the Republic of South Africa.
        </p>
      </div>

      <div>
        <h2 className="font-display text-xl mb-2">7. Contact</h2>
        <p>legal@africascoutpulse.com</p>
      </div>
    </section>
  </main>
);

export default Terms;
