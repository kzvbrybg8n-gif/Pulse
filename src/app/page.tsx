/* Page de vérification du design system — Phase 0.
   Remplacée en Phase 1 par la vraie vue « Aujourd'hui ».
   But : voir d'un coup d'œil que tokens, fontes et accents
   se chargent correctement (papier chaud + encre + accent vert sobre). */

type Swatch = { name: string; varName: string; fg?: string };

const PAPER: Swatch[] = [
  { name: "paper-0", varName: "--paper-0" },
  { name: "paper-1", varName: "--paper-1" },
  { name: "paper-2", varName: "--paper-2" },
  { name: "paper-3", varName: "--paper-3" },
  { name: "paper-4", varName: "--paper-4" },
];

const INK: Swatch[] = [
  { name: "ink-1", varName: "--ink-1", fg: "var(--paper-0)" },
  { name: "ink-2", varName: "--ink-2", fg: "var(--paper-0)" },
  { name: "ink-3", varName: "--ink-3", fg: "var(--paper-0)" },
  { name: "ink-4", varName: "--ink-4", fg: "var(--paper-0)" },
];

const ACCENT: Swatch[] = [
  { name: "green-1 (accent)", varName: "--green-1", fg: "var(--on-accent)" },
  { name: "green-2 (hover)", varName: "--green-2", fg: "var(--on-accent)" },
  { name: "green-3 (texte)", varName: "--green-3", fg: "var(--on-accent)" },
  { name: "green-soft", varName: "--green-soft", fg: "var(--green-3)" },
];

const SIGNAL: Swatch[] = [
  { name: "clay-1 (signal)", varName: "--clay-1", fg: "var(--on-accent)" },
  { name: "clay-2", varName: "--clay-2", fg: "var(--on-accent)" },
  { name: "clay-soft", varName: "--clay-soft", fg: "var(--clay-2)" },
];

function SwatchRow({ title, items }: { title: string; items: Swatch[] }) {
  return (
    <section style={{ marginBottom: "var(--space-6)" }}>
      <div className="pulse-label" style={{ marginBottom: "var(--space-3)" }}>
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
        {items.map((s) => (
          <div
            key={s.name}
            style={{
              width: 160,
              height: 72,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: `var(${s.varName})`,
              color: s.fg ?? "var(--ink-1)",
              padding: "var(--space-3) var(--space-4)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
            }}
          >
            <span>{s.name}</span>
            <span style={{ opacity: 0.75 }}>{s.varName}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function VerificationPage() {
  return (
    <main
      style={{
        background: "var(--bg)",
        color: "var(--fg)",
        minHeight: "100vh",
        padding: "var(--space-7) var(--space-7)",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <header style={{ marginBottom: "var(--space-7)" }}>
        <div className="pulse-label">Pulse · Phase 0</div>
        <h1
          className="pulse-h1"
          style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-3)" }}
        >
          Le pouls calme
        </h1>
        <p className="pulse-body-muted">
          Vérification visuelle du design system. Si tu vois Newsreader en titre,
          Hanken Grotesk en corps, IBM Plex Mono sur les méta et les bons tons
          de papier / encre / vert sobre — Phase 0 est validée.
        </p>
      </header>

      <section style={{ marginBottom: "var(--space-7)" }}>
        <div className="pulse-label" style={{ marginBottom: "var(--space-3)" }}>
          Typographie
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="pulse-h1">H1 — Newsreader, display</div>
          <div className="pulse-h2">H2 — Newsreader, section</div>
          <div className="pulse-h3">H3 — Newsreader, sous-section</div>
          <div className="pulse-title">Title — Hanken Grotesk, semibold</div>
          <div className="pulse-body">
            Body — Hanken Grotesk. Le texte courant reste lisible, aéré, sans
            tape-à-l&rsquo;œil. La police sans accompagne la serif sans la concurrencer.
          </div>
          <div className="pulse-body-muted">Body muted — second plan</div>
          <div className="pulse-sm">SM — méta secondaire</div>
          <div className="pulse-meta">META — IBM PLEX MONO · 12PX</div>
          <div className="pulse-label">Label — UPPERCASE, tracking</div>
          <div className="pulse-timer">25:00</div>
        </div>
      </section>

      <SwatchRow title="Papier" items={PAPER} />
      <SwatchRow title="Encre" items={INK} />
      <SwatchRow title="Accent vert" items={ACCENT} />
      <SwatchRow title="Signal argile (parcimonie)" items={SIGNAL} />

      <section style={{ marginTop: "var(--space-6)" }}>
        <div className="pulse-label" style={{ marginBottom: "var(--space-3)" }}>
          Tailwind v4 — tokens exposés
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-md bg-paper-1 border border-line-1 px-3 py-2 text-ink-1">
            bg-paper-1 / text-ink-1
          </span>
          <span className="rounded-md bg-accent-bg text-accent-text px-3 py-2 font-mono text-sm">
            bg-accent-bg
          </span>
          <button className="rounded-md bg-accent text-on-accent hover:bg-accent-hover px-4 py-2 text-sm font-semibold transition">
            bg-accent · bouton
          </button>
          <span className="rounded-md bg-signal-bg text-signal px-3 py-2 font-mono text-sm">
            bg-signal-bg
          </span>
        </div>
      </section>
    </main>
  );
}
