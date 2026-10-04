export default function StatusBanner({ status, children }) {
  return (
    <header className="banner" data-region="banner">
      <span className="titles">
        <span className="phase">{status.phaseLabel}</span>
        {status.progress && <span className="progress">{status.progress}</span>}
      </span>
      <span className="banner-tools">{children}</span>
    </header>
  );
}
