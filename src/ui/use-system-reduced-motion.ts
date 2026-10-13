import { useEffect, useState } from 'react';
export function useSystemReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media =
      typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    const change = () => setReduced(media?.matches ?? false);
    media?.addEventListener('change', change);
    change();
    return () => media?.removeEventListener('change', change);
  }, []);
  return reduced;
}
