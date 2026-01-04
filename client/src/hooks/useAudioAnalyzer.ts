import { useEffect, useRef, useState, useCallback } from 'react';

export interface AudioData {
  frequencies: Uint8Array;
  waveform: Uint8Array;
  bass: number;      // 0-1 average of low frequencies
  mid: number;       // 0-1 average of mid frequencies
  high: number;      // 0-1 average of high frequencies
  volume: number;    // 0-1 overall volume
  isBeat: boolean;   // Simple beat detection
}

interface UseAudioAnalyzerReturn {
  audioData: AudioData;
  isAnalyzing: boolean;
  startAnalyzing: () => void;
  stopAnalyzing: () => void;
}

const DEFAULT_AUDIO_DATA: AudioData = {
  frequencies: new Uint8Array(64),
  waveform: new Uint8Array(64),
  bass: 0,
  mid: 0,
  high: 0,
  volume: 0,
  isBeat: false,
};

// Beat detection threshold
const BEAT_THRESHOLD = 0.7;
const BEAT_DECAY = 0.95;

export function useAudioAnalyzer(): UseAudioAnalyzerReturn {
  const [audioData, setAudioData] = useState<AudioData>(DEFAULT_AUDIO_DATA);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastBassRef = useRef(0);
  const beatHoldRef = useRef(0);

  // Try to get Strudel's audio context or create analyzer from destination
  const setupAnalyzer = useCallback(async () => {
    try {
      // Option 1: Try to get Strudel's audio context from global scope
      const strudelAudioContext = (window as any).Strudel?.audioContext ||
                                   (window as any)._strudelAudioContext;

      if (strudelAudioContext) {
        audioContextRef.current = strudelAudioContext;
        const analyzer = strudelAudioContext.createAnalyser();
        analyzer.fftSize = 128;
        analyzer.smoothingTimeConstant = 0.8;
        analyzerRef.current = analyzer;

        // Connect to destination to analyze output
        strudelAudioContext.destination.connect(analyzer);
        console.log('[AudioAnalyzer] Connected to Strudel audio context');
        return true;
      }

      // Option 2: Create a new audio context and capture system audio
      // This works if the user allows media capture
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        audioContextRef.current = new AudioContext();
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 128;
        analyzerRef.current.smoothingTimeConstant = 0.8;

        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyzerRef.current);

        console.log('[AudioAnalyzer] Using microphone input for visualization');
        return true;
      } catch {
        // Microphone access denied - use simulated data
        console.log('[AudioAnalyzer] Using simulated audio data');
        return false;
      }
    } catch (err) {
      console.error('[AudioAnalyzer] Setup error:', err);
      return false;
    }
  }, []);

  const analyze = useCallback(() => {
    if (!analyzerRef.current) {
      // Generate simulated data based on time for visual effect
      const time = Date.now() / 1000;
      const frequencies = new Uint8Array(64);
      const waveform = new Uint8Array(64);

      for (let i = 0; i < 64; i++) {
        // Create pseudo-random but smooth frequency data
        const base = Math.sin(time * 2 + i * 0.2) * 0.3 + 0.4;
        const variation = Math.sin(time * 5 + i * 0.5) * 0.2;
        frequencies[i] = Math.floor((base + variation) * 128 + 64);
        waveform[i] = Math.floor((Math.sin(time * 10 + i * 0.3) * 0.5 + 0.5) * 255);
      }

      const bass = (Math.sin(time * 2) * 0.3 + 0.5);
      const mid = (Math.sin(time * 3 + 1) * 0.25 + 0.4);
      const high = (Math.sin(time * 5 + 2) * 0.2 + 0.3);

      // Simple simulated beat
      const isBeat = Math.sin(time * 4) > 0.9;

      setAudioData({
        frequencies,
        waveform,
        bass,
        mid,
        high,
        volume: (bass + mid + high) / 3,
        isBeat,
      });

      animationFrameRef.current = requestAnimationFrame(analyze);
      return;
    }

    const frequencies = new Uint8Array(analyzerRef.current.frequencyBinCount);
    const waveform = new Uint8Array(analyzerRef.current.frequencyBinCount);

    analyzerRef.current.getByteFrequencyData(frequencies);
    analyzerRef.current.getByteTimeDomainData(waveform);

    // Calculate frequency bands
    const binCount = frequencies.length;
    const bassEnd = Math.floor(binCount * 0.15);    // 0-15% = bass
    const midEnd = Math.floor(binCount * 0.5);       // 15-50% = mid
    // 50-100% = high

    let bassSum = 0, midSum = 0, highSum = 0;

    for (let i = 0; i < binCount; i++) {
      if (i < bassEnd) {
        bassSum += frequencies[i];
      } else if (i < midEnd) {
        midSum += frequencies[i];
      } else {
        highSum += frequencies[i];
      }
    }

    const bass = bassSum / (bassEnd * 255) || 0;
    const mid = midSum / ((midEnd - bassEnd) * 255) || 0;
    const high = highSum / ((binCount - midEnd) * 255) || 0;
    const volume = (bass + mid + high) / 3;

    // Beat detection: significant increase in bass
    let isBeat = false;
    if (bass > lastBassRef.current + BEAT_THRESHOLD * 0.3 && bass > 0.5) {
      isBeat = true;
      beatHoldRef.current = 5; // Hold beat for a few frames
    } else if (beatHoldRef.current > 0) {
      beatHoldRef.current--;
      isBeat = beatHoldRef.current > 3;
    }
    lastBassRef.current = lastBassRef.current * BEAT_DECAY + bass * (1 - BEAT_DECAY);

    setAudioData({
      frequencies,
      waveform,
      bass,
      mid,
      high,
      volume,
      isBeat,
    });

    animationFrameRef.current = requestAnimationFrame(analyze);
  }, []);

  const startAnalyzing = useCallback(async () => {
    if (isAnalyzing) return;

    await setupAnalyzer();
    setIsAnalyzing(true);
    analyze();
  }, [isAnalyzing, setupAnalyzer, analyze]);

  const stopAnalyzing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsAnalyzing(false);
    setAudioData(DEFAULT_AUDIO_DATA);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalyzing();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        // Don't close Strudel's context
        if (sourceRef.current) {
          audioContextRef.current.close();
        }
      }
    };
  }, [stopAnalyzing]);

  return {
    audioData,
    isAnalyzing,
    startAnalyzing,
    stopAnalyzing,
  };
}
