import { useCallback, useRef, useState, useEffect } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import type { Segment } from '../../../shared/types';

interface UseMidiPlayerReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoaded: boolean;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seekTo: (seconds: number) => void;
  loadSegment: (segment: Segment) => void;
  loadAllSegments: (segments: Segment[]) => void;
}

export function useMidiPlayer(): UseMidiPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const synthsRef = useRef<Tone.PolySynth[]>([]);
  const partsRef = useRef<Tone.Part[]>([]);
  const animationRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      synthsRef.current.forEach((synth) => synth.dispose());
      partsRef.current.forEach((part) => part.dispose());
    };
  }, []);

  const stop = useCallback(() => {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    setIsPlaying(false);
    setCurrentTime(0);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Stop all notes
    synthsRef.current.forEach((synth) => synth.releaseAll());
  }, []);

  const pause = useCallback(() => {
    Tone.getTransport().pause();
    setIsPlaying(false);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const updateTime = useCallback(() => {
    const transport = Tone.getTransport();
    setCurrentTime(transport.seconds);

    if (transport.state === 'started') {
      animationRef.current = requestAnimationFrame(updateTime);
    }
  }, []);

  const play = useCallback(async () => {
    await Tone.start();

    if (Tone.getTransport().state === 'paused') {
      Tone.getTransport().start();
    } else {
      Tone.getTransport().start();
    }

    setIsPlaying(true);
    updateTime();
  }, [updateTime]);

  const seekTo = useCallback((seconds: number) => {
    const transport = Tone.getTransport();
    const wasPlaying = transport.state === 'started';

    // Stop all currently sounding notes
    synthsRef.current.forEach((synth) => synth.releaseAll());

    // Seek to the new position
    transport.seconds = seconds;
    setCurrentTime(seconds);

    // Resume if we were playing
    if (wasPlaying) {
      transport.start();
    }
  }, []);

  const loadMidi = useCallback((midiData: ArrayBuffer, startTime: number = 0) => {
    const midi = new Midi(midiData);

    // Create synths for each track if needed
    while (synthsRef.current.length < midi.tracks.length) {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.5,
          release: 0.3,
        },
      }).toDestination();
      synth.volume.value = -6;
      synthsRef.current.push(synth);
    }

    // Schedule notes for each track
    midi.tracks.forEach((track, trackIndex) => {
      const synth = synthsRef.current[trackIndex];

      const events = track.notes.map((note) => ({
        time: startTime + note.time,
        note: note.name,
        duration: note.duration,
        velocity: note.velocity,
      }));

      const part = new Tone.Part((time, event) => {
        synth.triggerAttackRelease(
          event.note,
          event.duration,
          time,
          event.velocity
        );
      }, events);

      part.start(0);
      partsRef.current.push(part);
    });

    return midi.duration;
  }, []);

  const loadSegment = useCallback((segment: Segment) => {
    // Clear existing parts
    partsRef.current.forEach((part) => part.dispose());
    partsRef.current = [];

    // Decode base64 to ArrayBuffer
    const binaryString = atob(segment.midiBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const segmentDuration = loadMidi(bytes.buffer, 0);
    setDuration(segmentDuration);
    setIsLoaded(true);
    setCurrentTime(0);
  }, [loadMidi]);

  const loadAllSegments = useCallback((segments: Segment[]) => {
    // Clear existing parts
    partsRef.current.forEach((part) => part.dispose());
    partsRef.current = [];

    let totalDuration = 0;

    segments.forEach((segment) => {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(segment.midiBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const segmentDuration = loadMidi(bytes.buffer, totalDuration);
      totalDuration += segmentDuration;
    });

    setDuration(totalDuration);
    setIsLoaded(segments.length > 0);
    setCurrentTime(0);
  }, [loadMidi]);

  return {
    isPlaying,
    currentTime,
    duration,
    isLoaded,
    play,
    pause,
    stop,
    seekTo,
    loadSegment,
    loadAllSegments,
  };
}
