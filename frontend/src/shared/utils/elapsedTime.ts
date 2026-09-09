import { useRef } from 'react';

export const useElapsedTimer = () => {
  const startRef = useRef<number | null>(null);
  const start = () => { startRef.current = performance.now(); };
  const stop = (): number => startRef.current != null ? Math.round(performance.now() - startRef.current) : 0;
  return { start, stop };
};

export const formatElapsed = (ms: number) => `${(ms / 1000).toFixed(1)}초`;
