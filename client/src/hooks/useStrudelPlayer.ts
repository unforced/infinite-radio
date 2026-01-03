import { useCallback, useRef, useState, useEffect } from 'react';

// Strudel types (minimal)
declare global {
  function initStrudel(): Promise<void>;
  function hush(): void;
  function setcps(cps: number): void;
  function evaluate(code: string): Promise<any>;
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

      // Evaluate the new pattern
      // Strudel patterns need to end with .play() or we call it
      const patternCode = code.includes('.play()') ? code : `${code}.play()`;

      // Use Function constructor to evaluate in global scope where Strudel functions exist
      const fn = new Function(patternCode);
      fn();

      setCurrentPattern(code);
      setIsPlaying(true);
      setError(null);
      console.log('[Strudel] Playing pattern');
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
