export default function PrimaryButton({ primary, onPress }) {
  return (
    <div className="action" data-region="action">
      <button type="button" className="btn btn-primary" disabled={!primary.enabled} onClick={onPress}>
        {primary.label}
      </button>
      <span className="hint">{primary.hint}</span>
    </div>
  );
}
