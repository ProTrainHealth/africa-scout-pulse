import { useEffect } from 'react';

/**
 * Terminal aesthetic: dark mode is the default and only mode.
 */
export function useTimeBasedTheme() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
}
