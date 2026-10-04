type EmptyStateProps = { title: string; description: string; actionLabel?: string; note?: string; status?: "empty" | "loading" | "success" | "error" };

export function EmptyState({ title, description, actionLabel, note, status = "empty" }: EmptyStateProps) {
  return <section className={`empty-state empty-state-${status}`} role={status === "error" ? "alert" : "status"} aria-live="polite">
    <div className="empty-state-kicker">{status === "empty" ? "No records" : status}</div><h2>{title}</h2><p className="muted">{description}</p>
    {actionLabel ? <button className="button primary" type="button" disabled aria-disabled="true">{actionLabel}</button> : null}
    {note ? <p className="empty-state-note">{note}</p> : null}
  </section>;
}
