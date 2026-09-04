import { useEffect, useState } from 'react';

import { formatCountdown, getRemainingMs, getTickIntervalMs } from '@/lib/countdown';

export type Countdown = {
  remainingMs: number | null;
  isExpired: boolean;
  label: string;
};

/**
 * Live countdown to a market's closing time.
 *
 * The remaining time is derived during render rather than held in state, so it
 * is always current -- including on mount and when a screen comes back from the
 * background. The effect only schedules re-renders. It self-paces via chained
 * timeouts so the interval can shrink from a minute to a second as the deadline
 * approaches, and stops scheduling entirely once the market has closed.
 */
export function useCountdown(closesAt: string | undefined): Countdown {
  const [, setTick] = useState(0);
  const remainingMs = closesAt ? getRemainingMs(closesAt) : null;

  useEffect(() => {
    if (!closesAt) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      const interval = getTickIntervalMs(getRemainingMs(closesAt));

      if (interval === 0) {
        return;
      }

      timeout = setTimeout(() => {
        setTick((tick) => tick + 1);
        schedule();
      }, interval);
    };

    schedule();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [closesAt]);

  return {
    remainingMs,
    isExpired: remainingMs === 0,
    label: formatCountdown(remainingMs),
  };
}
