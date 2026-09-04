const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function getRemainingMs(closesAt: string, now: number = Date.now()) {
  const target = Date.parse(closesAt);

  if (Number.isNaN(target)) {
    return null;
  }

  return Math.max(0, target - now);
}

export function isMarketExpired(closesAt: string, now: number = Date.now()) {
  const remaining = getRemainingMs(closesAt, now);

  // An unparseable closing date is not treated as expired. Betting is guarded by
  // place_bet regardless, so the safe read here is to leave the market alone.
  return remaining !== null && remaining === 0;
}

export function formatCountdown(remainingMs: number | null) {
  if (remainingMs === null) {
    return 'Closing date unavailable';
  }

  if (remainingMs === 0) {
    return 'Closed';
  }

  const days = Math.floor(remainingMs / DAY);
  const hours = Math.floor((remainingMs % DAY) / HOUR);
  const minutes = Math.floor((remainingMs % HOUR) / MINUTE);
  const seconds = Math.floor((remainingMs % MINUTE) / SECOND);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;

  return `${seconds}s`;
}

/** Absolute closing time, for admin screens where the exact date matters. */
export function formatClosingDate(closesAt: string) {
  const target = Date.parse(closesAt);

  if (Number.isNaN(target)) {
    return 'Unknown';
  }

  return new Date(target).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * How long to wait before the countdown label could next change. Under an hour
 * the label carries seconds so it has to tick every second; above that only the
 * minutes move, and ticking every second would re-render every card for nothing.
 * Returns 0 once there is nothing left to count down to.
 */
export function getTickIntervalMs(remainingMs: number | null) {
  if (remainingMs === null || remainingMs === 0) {
    return 0;
  }

  return remainingMs < HOUR ? SECOND : MINUTE;
}
