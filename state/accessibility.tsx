import { createContext, use, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'unswager.accessibility';

export type TextSize = 'default' | 'large' | 'larger';

export const TEXT_SIZE_SCALES: Record<TextSize, number> = {
  default: 1,
  large: 1.15,
  larger: 1.3,
};

export type AccessibilityPreferences = {
  textSize: TextSize;
  boldText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
};

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  textSize: 'default',
  boldText: false,
  highContrast: false,
  reduceMotion: false,
};

type AccessibilityContextValue = AccessibilityPreferences & {
  textScale: number;
  setPreference: <K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => void;
};

// Every text node in the app reads this context, including screens rendered
// outside the provider in tests or storybook-style previews, so the default
// value is a working set of preferences rather than a thrown error.
const AccessibilityContext = createContext<AccessibilityContextValue>({
  ...DEFAULT_PREFERENCES,
  textScale: TEXT_SIZE_SCALES.default,
  setPreference: () => {},
});

function parsePreferences(raw: string | null): AccessibilityPreferences | null {
  if (!raw) {
    return null;
  }
  try {
    const stored = JSON.parse(raw) as Partial<AccessibilityPreferences>;
    return {
      textSize: stored.textSize && stored.textSize in TEXT_SIZE_SCALES
        ? stored.textSize
        : DEFAULT_PREFERENCES.textSize,
      boldText: stored.boldText ?? DEFAULT_PREFERENCES.boldText,
      highContrast: stored.highContrast ?? DEFAULT_PREFERENCES.highContrast,
      reduceMotion: stored.reduceMotion ?? DEFAULT_PREFERENCES.reduceMotion,
    };
  } catch {
    // A corrupt payload should cost the user their preferences, not the app.
    return null;
  }
}

/**
 * Reads one of the OS accessibility flags, treating any platform gap as "off".
 *
 * The existence check is the point: `isBoldTextEnabled` is iOS-only, and on
 * other platforms it is not merely a promise that rejects, it is undefined. A
 * bare `.catch()` never gets the chance to attach, so calling it directly threw
 * a TypeError and took the whole provider down at launch.
 */
async function readSystemFlag(flag: 'isReduceMotionEnabled' | 'isBoldTextEnabled') {
  const read = AccessibilityInfo[flag];
  if (typeof read !== 'function') {
    return false;
  }

  try {
    return await read.call(AccessibilityInfo);
  } catch {
    return false;
  }
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

  // Load saved preferences, falling back to whatever the OS already knows
  // about this user so the first launch is not a step backwards from their
  // system settings.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // try/catch rather than .catch(): on a platform without SecureStore this
      // throws rather than rejecting, and an unhandled throw here would leave
      // the app stuck on defaults with no preferences at all.
      let raw: string | null = null;
      try {
        raw = await SecureStore.getItemAsync(STORAGE_KEY);
      } catch {
        raw = null;
      }

      const stored = parsePreferences(raw);
      if (stored) {
        if (!cancelled) {
          setPreferences(stored);
        }
        return;
      }

      const [reduceMotion, boldText] = await Promise.all([
        readSystemFlag('isReduceMotionEnabled'),
        readSystemFlag('isBoldTextEnabled'),
      ]);
      if (!cancelled) {
        setPreferences({ ...DEFAULT_PREFERENCES, reduceMotion, boldText });
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...preferences,
      textScale: TEXT_SIZE_SCALES[preferences.textSize],
      setPreference: (key, nextValue) => {
        setPreferences((current) => {
          const next = { ...current, [key]: nextValue };
          // Write through rather than await: the toggle should feel instant,
          // and a failed write only costs this one change. Wrapped because a
          // throw here would escape from inside a state updater.
          try {
            SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
          } catch {
            // Preference is still applied in memory for this session.
          }
          return next;
        });
      },
    }),
    [preferences]
  );

  return <AccessibilityContext value={value}>{children}</AccessibilityContext>;
}

export function useAccessibility() {
  return use(AccessibilityContext);
}
