import React, { useEffect } from 'react';
import { useAppStore } from '@/domain/store';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppStore((s) => s.dispatch);

  useEffect(() => {
    // Detect OS prefers-reduced-motion on initial mount
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      dispatch({ type: 'SET_REDUCED_MOTION', enabled: true });
    }
    const handler = (e: MediaQueryListEvent) => {
      dispatch({ type: 'SET_REDUCED_MOTION', enabled: e.matches });
    };
    mq.addEventListener('change', handler);

    // Handle URL query params for deterministic test time or safe initial state
    const params = new URLSearchParams(window.location.search);
    const reducedParam = params.get('reducedMotion');
    if (reducedParam === '1' || reducedParam === 'true') {
      dispatch({ type: 'SET_REDUCED_MOTION', enabled: true });
    }

    return () => mq.removeEventListener('change', handler);
  }, [dispatch]);

  return <>{children}</>;
};
