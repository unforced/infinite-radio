import { useCallback, useRef, useState, useEffect } from 'react';

// Strudel types (minimal)
declare global {
  function initStrudel(): Promise<void>;
  function hush(): void;
  function setcps(cps: number): void;
  function evaluate(code: string): Promise<any>;
}

// Safe fallback pattern that always works
const FALLBACK_PATTERN = `note("c3 eb3 g3 bb3").s("sawtooth").cutoff(800).room(0.5).slow(2)`;

/**
 * Validate Strudel pattern code for common issues
 * Returns { valid: true } or { valid: false, reason: string }
 */
function validatePattern(code: string): { valid: boolean; reason?: string } {
  // Check for empty or whitespace-only
  if (!code || !code.trim()) {
    return { valid: false, reason: 'Empty pattern' };
  }

  // Check for obvious syntax issues
  const trimmed = code.trim();

  // Pattern starting with a string literal that has methods called on it incorrectly
  // e.g., "0.4 0.6".slow() - strings don't have Strudel methods
  if (/^["'][^"']*["']\s*\./.test(trimmed) && !trimmed.startsWith('note(') && !trimmed.startsWith('s(') && !trimmed.startsWith('sound(')) {
    return { valid: false, reason: 'Pattern starts with invalid string literal' };
  }

  // Check for unbalanced parentheses
  let parenCount = 0;
  for (const char of trimmed) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) {
      return { valid: false, reason: 'Unbalanced parentheses' };
    }
  }
  if (parenCount !== 0) {
    return { valid: false, reason: 'Unbalanced parentheses' };
  }

  // Check for unbalanced brackets
  let bracketCount = 0;
  for (const char of trimmed) {
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;
    if (bracketCount < 0) {
      return { valid: false, reason: 'Unbalanced brackets' };
    }
  }
  if (bracketCount !== 0) {
    return { valid: false, reason: 'Unbalanced brackets' };
  }

  // Check for common Strudel functions at the start
  const validStarters = [
    'note', 'n', 's', 'sound', 'stack', 'sequence', 'cat', 'fastcat', 'slowcat',
    'polymeter', 'polyrhythm', 'silence', 'pure', 'mini', 'seq', 'chord'
  ];
  const startsValid = validStarters.some(fn =>
    trimmed.startsWith(`${fn}(`) || trimmed.startsWith(`${fn} (`)
  );

  if (!startsValid) {
    // Could still be valid if it's a method chain on a global, but warn
    console.warn('[Strudel] Pattern does not start with common function:', trimmed.slice(0, 50));
  }

  // Check for statements (semicolons, let, const, var) which aren't allowed
  if (/;/.test(trimmed) || /\b(let|const|var)\s/.test(trimmed)) {
    return { valid: false, reason: 'Pattern contains statements - must be single expression' };
  }

  return { valid: true };
}

interface UseStrudelPlayerReturn {
  isPlaying: boolean;
  isInitialized: boolean;
  currentPattern: string | null;
  error: string | null;
  initialize: () => Promise<void>;
  playPattern: (code: string) => Promise<void>;
  stop: () => void;
}

export function useStrudelPlayer(): UseStrudelPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentPattern, setCurrentPattern] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  // Load Strudel from CDN
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@strudel/web@1.2.5';
    script.async = true;
    script.onload = () => {
      console.log('[Strudel] Script loaded');
    };
    script.onerror = () => {
      setError('Failed to load Strudel');
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initialize = useCallback(async () => {
    if (isInitialized) return;
    if (initPromiseRef.current) return initPromiseRef.current;

    initPromiseRef.current = (async () => {
      try {
        // Wait for initStrudel to be available
        let attempts = 0;
        while (typeof initStrudel === 'undefined' && attempts < 50) {
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }

        if (typeof initStrudel === 'undefined') {
          throw new Error('Strudel not loaded');
        }

        await initStrudel();
        setIsInitialized(true);
        setError(null);
        console.log('[Strudel] Initialized');
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    })();

    return initPromiseRef.current;
  }, [isInitialized]);

  const playPattern = useCallback(async (code: string) => {
    try {
      if (!isInitialized) {
        await initialize();
      }

      // Stop any current pattern
      if (typeof hush !== 'undefined') {
        hush();
      }

      // Validate the pattern before trying to play it
      const validation = validatePattern(code);
      let patternToPlay = code;

      if (!validation.valid) {
        console.error(`[Strudel] Invalid pattern: ${validation.reason}`);
        console.error('[Strudel] Pattern was:', code);
        console.log('[Strudel] Using fallback pattern');
        patternToPlay = FALLBACK_PATTERN;
        setError(`Pattern error: ${validation.reason} - using fallback`);
      }

      // Strudel patterns need to end with .play() or we call it
      const patternCode = patternToPlay.includes('.play()') ? patternToPlay : `${patternToPlay}.play()`;

      // Use Function constructor to evaluate in global scope where Strudel functions exist
      try {
        const fn = new Function(patternCode);
        fn();
        setCurrentPattern(patternToPlay);
        setIsPlaying(true);
        if (validation.valid) {
          setError(null);
        }
        console.log('[Strudel] Playing pattern');
      } catch (evalError) {
        // If pattern fails to evaluate, try the fallback
        console.error('[Strudel] Pattern evaluation failed:', evalError);
        console.log('[Strudel] Attempting fallback pattern');

        const fallbackCode = `${FALLBACK_PATTERN}.play()`;
        const fallbackFn = new Function(fallbackCode);
        fallbackFn();

        setCurrentPattern(FALLBACK_PATTERN);
        setIsPlaying(true);
        setError(`Pattern failed to play: ${(evalError as Error).message} - using fallback`);
      }
    } catch (err) {
      console.error('[Strudel] Error playing pattern:', err);
      setError((err as Error).message);
      setIsPlaying(false);
    }
  }, [isInitialized, initialize]);

  const stop = useCallback(() => {
    if (typeof hush !== 'undefined') {
      hush();
    }
    setIsPlaying(false);
    console.log('[Strudel] Stopped');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof hush !== 'undefined') {
        hush();
      }
    };
  }, []);

  return {
    isPlaying,
    isInitialized,
    currentPattern,
    error,
    initialize,
    playPattern,
    stop,
  };
}
