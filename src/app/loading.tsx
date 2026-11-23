export default function Loading() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-live="polite">
      <div className="skeleton sk-hero" />
      <div className="sk-row">
        <div className="skeleton sk-card" />
        <div className="skeleton sk-card" />
        <div className="skeleton sk-card" />
        <div className="skeleton sk-card" />
      </div>
      <div className="skeleton sk-block" />
    </div>
  );
}
