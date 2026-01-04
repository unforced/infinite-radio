import { useEffect, useRef, useState, useCallback } from 'react';
import type { Segment } from '../../../shared/types';

export interface VisualizerData {
  // Simulated frequency bands based on pattern energy/style
  bass: number;      // 0-1
  mid: number;       // 0-1
  high: number;      // 0-1
  // Beat pulse synchronized to tempo
  beatPhase: number; // 0-1, cycles with tempo
  isBeat: boolean;   // true on beat hits
  // Pattern metadata
  energy: number;    // 0-1 based on low/medium/high
  tempo: number;     // BPM
}

interface UsePatternVisualizerReturn {
  data: VisualizerData;
  isActive: boolean;
  start: () => void;
  stop: () => void;
}

const DEFAULT_DATA: VisualizerData = {
  bass: 0,
  mid: 0,
  high: 0,
  beatPhase: 0,
  isBeat: false,
  energy: 0.5,
  tempo: 90,
};

// Map energy string to numeric value
function energyToNumber(energy: 'low' | 'medium' | 'high'): number {
  switch (energy) {
    case 'low': return 0.3;
    case 'medium': return 0.6;
    case 'high': return 0.9;
    default: return 0.5;
  }
}

// Map style to frequency characteristics
function styleToFrequencies(style: string, energy: number, phase: number): { bass: number; mid: number; high: number } {
  const normalizedStyle = style.toLowerCase();

  // Base frequencies vary by style
  let bassBase = 0.5;
  let midBase = 0.5;
  let highBase = 0.5;

  if (normalizedStyle.includes('ambient') || normalizedStyle.includes('drone')) {
    bassBase = 0.7;
    midBase = 0.4;
    highBase = 0.3;
  } else if (normalizedStyle.includes('techno') || normalizedStyle.includes('house')) {
    bassBase = 0.8;
    midBase = 0.5;
    highBase = 0.6;
  } else if (normalizedStyle.includes('lofi') || normalizedStyle.includes('jazz')) {
    bassBase = 0.5;
    midBase = 0.7;
    highBase = 0.4;
  }

  // Modulate with energy and phase
  const variation = 0.2 * energy;

  return {
    bass: bassBase + Math.sin(phase * Math.PI * 2) * variation,
    mid: midBase + Math.sin(phase * Math.PI * 2 + 1) * variation * 0.8,
    high: highBase + Math.sin(phase * Math.PI * 4 + 2) * variation * 0.6,
  };
}

export function usePatternVisualizer(pattern: Segment | null): UsePatternVisualizerReturn {
  const [data, setData] = useState<VisualizerData>(DEFAULT_DATA);
  const [isActive, setIsActive] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastBeatRef = useRef<number>(0);

  const animate = useCallback(() => {
    if (!pattern) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    const now = Date.now();
    const elapsed = (now - startTimeRef.current) / 1000; // seconds

    // Calculate beat phase based on tempo
    const beatsPerSecond = pattern.tempo / 60;
    const beatPhase = (elapsed * beatsPerSecond) % 1;

    // Detect beat (when phase wraps around)
    const currentBeat = Math.floor(elapsed * beatsPerSecond);
    const isBeat = currentBeat > lastBeatRef.current;
    lastBeatRef.current = currentBeat;

    // Get energy level
    const energy = energyToNumber(pattern.energy);

    // Calculate frequency bands based on style and beat phase
    const frequencies = styleToFrequencies(pattern.style, energy, elapsed);

    // Add beat emphasis
    const beatEmphasis = isBeat ? 0.3 : 0;

    setData({
      bass: Math.min(1, frequencies.bass + beatEmphasis),
      mid: frequencies.mid,
      high: frequencies.high + (isBeat ? 0.1 : 0),
      beatPhase,
      isBeat,
      energy,
      tempo: pattern.tempo,
    });

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [pattern]);

  const start = useCallback(() => {
    if (isActive) return;
    startTimeRef.current = Date.now();
    lastBeatRef.current = 0;
    setIsActive(true);
    animate();
  }, [isActive, animate]);

  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsActive(false);
    setData(DEFAULT_DATA);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    data,
    isActive,
    start,
    stop,
  };
}
