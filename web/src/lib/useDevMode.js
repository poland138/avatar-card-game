import { useEffect, useState } from 'react';

export function useDevMode() {
  const [dev, setDev] = useState(() => ({
    enabled: new URLSearchParams(window.location.search).has('debug'),
    showHands: true,
    showNextPick: true,
  }));

  useEffect(() => {
    function onKey(e) {
      if (e.key !== '`') return;
      if (e.target instanceof Element && e.target.closest('input, textarea')) return;
      setDev(d => ({ ...d, enabled: !d.enabled }));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return [dev, setDev];
}
