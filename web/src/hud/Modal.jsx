import { useEffect, useRef } from 'react';

export default function Modal({ title, onClose, closeLabel = 'Close', children }) {
  const button = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  // Focus once on mount; re-focusing every render would yank scroll in long modals.
  useEffect(() => { button.current?.focus(); }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="modal-backdrop" onClick={() => closeRef.current()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
        <div className="actions">
          <button ref={button} type="button" className="btn btn-primary" onClick={() => closeRef.current()}>
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
