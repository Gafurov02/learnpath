'use client';

import { useEffect } from 'react';

type UseLiveRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number;
  onRefresh: () => void | Promise<void>;
};

export function useLiveRefresh({
  enabled = true,
  intervalMs = 15000,
  onRefresh,
}: UseLiveRefreshOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const runRefresh = () => {
      void onRefresh();
    };

    const intervalId = window.setInterval(runRefresh, intervalMs);
    const handleFocus = () => runRefresh();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs, onRefresh]);
}
