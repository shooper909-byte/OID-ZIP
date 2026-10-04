import type { SyntheticStagingMode } from "../../lib/synthetic-staging";

export function SyntheticStagingBanner({ mode }: { mode: SyntheticStagingMode }) {
  return <aside className="synthetic-banner" role="status" aria-label={mode.label}>
    <strong>{mode.label}</strong><span>{mode.notice}</span><span className="synthetic-banner-state">Product entry enabled</span>
  </aside>;
}
