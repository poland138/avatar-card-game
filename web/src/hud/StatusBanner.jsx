export default function StatusBanner({ status, children }) {
  return (
    <header className="banner" data-region="banner">
      <span className="titles">
        <span className="phase">{status.phaseLabel}</span>
        {status.progress && <span className="progress">{status.progress}</span>}
      </span>
      <span className="instruction" data-testid="instruction" aria-live="polite">{status.instruction}</span>
      <span className="banner-tools">{children}</span>
    </header>
  );
}
