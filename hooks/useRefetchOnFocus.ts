'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom hook to trigger a callback when the window/tab regains focus or visibility.
 * This is essential for keeping data fresh and recovering from suspended states
 * when the user switches tabs.
 */
export function useRefetchOnFocus(onFocus: () => void) {
  const onFocusRef = useRef(onFocus);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onFocusRef.current();
      }
    };

    const handleFocus = () => {
      onFocusRef.current();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
}
