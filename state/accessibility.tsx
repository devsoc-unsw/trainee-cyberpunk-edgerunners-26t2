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

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

  // Load saved preferences, falling back to whatever the OS already knows
  // about this user so the first launch is not a step backwards from their
  // system settings.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const stored = parsePreferences(
        await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null)
      );
      if (stored) {
        if (!cancelled) {
          setPreferences(stored);
        }
        return;
      }

      // isBoldTextEnabled is iOS-only; treat any platform gap as "off" rather
      // than losing the whole seed.
      const [reduceMotion, boldText] = await Promise.all([
        AccessibilityInfo.isReduceMotionEnabled().catch(() => false),
        AccessibilityInfo.isBoldTextEnabled().catch(() => false),
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
          // and a failed write only costs this one change.
          SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
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
