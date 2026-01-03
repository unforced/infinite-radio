import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Theme,
  getThemeForPattern,
  applyTheme,
  DEFAULT_THEME,
} from '../lib/theme-generator';
import type { Segment } from '../../../shared/types';

interface UseThemeReturn {
  theme: Theme;
  isTransitioning: boolean;
}

const TRANSITION_DURATION = 2000; // 2 seconds for smooth transitions

export function useTheme(pattern: Segment | null): UseThemeReturn {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const lastPatternIdRef = useRef<string | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply theme changes smoothly
  const transitionToTheme = useCallback((newTheme: Theme) => {
    setIsTransitioning(true);
    setTheme(newTheme);
    applyTheme(newTheme);

    // Clear any existing transition timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // Mark transition as complete after duration
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, []);

  // Update theme when pattern changes
  useEffect(() => {
    if (pattern && pattern.id !== lastPatternIdRef.current) {
      lastPatternIdRef.current = pattern.id;

      const newTheme = getThemeForPattern(
        pattern.style,
        pattern.energy as 'low' | 'medium' | 'high'
      );

      transitionToTheme(newTheme);
    }
  }, [pattern, transitionToTheme]);

  // Apply default theme on mount
  useEffect(() => {
    applyTheme(DEFAULT_THEME);

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return { theme, isTransitioning };
}
