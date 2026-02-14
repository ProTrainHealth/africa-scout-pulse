import { useEffect } from 'react';

/**
 * Auto light/dark mode based on user's local time.
 * Dark mode: 6 PM – 6 AM, Light mode: 6 AM – 6 PM.
 */
export function useTimeBasedTheme() {
  useEffect(() => {
    const applyTheme = () => {
      const hour = new Date().getHours();
      const isDark = hour >= 18 || hour < 6;
      document.documentElement.classList.toggle('dark', isDark);
    };

    applyTheme();

    // Re-check every minute
    const interval = setInterval(applyTheme, 60_000);
    return () => clearInterval(interval);
  }, []);
}
