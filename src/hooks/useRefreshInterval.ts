import { useEffect, useState } from 'react';

export const DEFAULT_REFRESH_INTERVAL = 30_000;

/**
 * Fetches the refresh interval from /api/config once on mount.
 * Returns the interval in milliseconds (0 = disabled).
 */
export function useRefreshInterval(): number {
  const [interval, setInterval] = useState(DEFAULT_REFRESH_INTERVAL);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (typeof cfg.refreshInterval === 'number') {
          setInterval(cfg.refreshInterval);
        }
      })
      .catch(() => {});
  }, []);

  return interval;
}
