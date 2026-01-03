// Core MIDI generation logic - Enhanced version
import MidiWriter from 'midi-writer-js';
import {
  STYLE_PARAMS,
  getChord,
  getChordFromDegree,
  getProgression,
  noteToMidi,
  midiToNote,
  NOTES,
  StyleParams,
} from './music-theory.js';

export interface ContinuationContext {
  key: string;
  mode: string;
  tempo: number;
  style: string;
  progressionPosition: number;
  currentChord: string | null;
  currentChordType: string | null;
  lastNotes: {
    melody: Array<{ note: string; velocity: number }>;
    bass: Array<{ note: string; velocity: number }>;
    chords: Array<{ notes: string[]; velocity: number }>;
  };
  dynamics: {
    level: 'soft' | 'medium' | 'loud';
    direction: 'building' | 'fading' | 'stable';
    velocityTrend: number;
  };
  totalBars: number;
  motif?: number[];
}

export interface GenerationOptions {
  bars?: number;
  key?: string;
  mode?: string;
  tempo?: number;
  style?: string;
  // Extension options
  totalBarsOffset?: number; // How many bars have been generated before this segment
  extensionDirection?: 'continue' | 'build' | 'peak' | 'wind_down' | 'contrast';
}

export interface SegmentInfo {
  bars: number;
  durationSeconds: number;
  endingNotes: {
    melody: Array<{ note: string; velocity: number }>;
    bass: Array<{ note: string; velocity: number }>;
    chords: Array<{ notes: string[]; velocity: number }>;
  };
  endingChord: string;
  endingChordType: string;
  progressionPosition: number;
  dynamics: {
    level: 'soft' | 'medium' | 'loud';
    direction: 'building' | 'fading' | 'stable';
    velocityTrend: number;
  };
  motif?: number[];
}

export interface GenerationResult {
  midiData: Uint8Array;
  midiBase64: string;
  segmentInfo: SegmentInfo;
}

// Humanization: add subtle timing variations (in ticks)
function humanizeTiming(tick: number, amount: number = 5): number {
  const varied = tick + Math.floor((Math.random() - 0.5) * amount * 2);
  return Math.max(0, varied); // Never go negative
}

// Humanization: add velocity variations
function humanizeVelocity(velocity: number, amount: number = 8): number {
  const varied = velocity + Math.floor((Math.random() - 0.5) * amount * 2);
  return Math.min(127, Math.max(1, varied));
}

// Generate a melodic motif (short phrase that can be repeated/varied)
function generateMotif(scaleLength: number): number[] {
  const motifLength = 4 + Math.floor(Math.random() * 4); // 4-7 notes
  const motif: number[] = [];
  let current = Math.floor(Math.random() * 3) + 2; // Start on 3rd-5th scale degree

  for (let i = 0; i < motifLength; i++) {
    motif.push(current);
    // Stepwise motion with occasional leaps
    const step = Math.random() < 0.7
      ? (Math.random() < 0.5 ? 1 : -1)  // Step
      : (Math.random() < 0.5 ? 2 : -2); // Leap
    current = Math.max(0, Math.min(scaleLength - 1, current + step));
  }

  return motif;
}

// Apply variation to a motif
function varyMotif(motif: number[], variation: number, scaleLength: number): number[] {
  switch (variation % 4) {
    case 0: return motif; // Original
    case 1: return motif.map(n => Math.min(scaleLength - 1, n + 2)); // Sequence up
    case 2: return [...motif].reverse(); // Retrograde
    case 3: return motif.map(n => Math.max(0, scaleLength - 1 - n)); // Inversion
    default: return motif;
  }
}

// Drum patterns per style (16th notes, channel 10)
const DRUM_PATTERNS: Record<string, { kick: number[]; snare: number[]; hihat: number[]; ride?: number[] }> = {
  ambient: {
    kick: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    hihat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  lofi: {
    kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  },
  electronic: {
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
  },
  classical: {
    kick: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    hihat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  jazz: {
    kick:  [1,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
    snare: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    hihat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    ride:  [1,0,1,1, 0,1,1,0, 1,1,0,1, 1,0,1,0],
  },
};

// Bass patterns per style
const BASS_PATTERNS: Record<string, { pattern: string; notes: string[] }> = {
  ambient: { pattern: 'sustained', notes: ['root'] },
  lofi: { pattern: 'groove', notes: ['root', 'fifth', 'root', 'seventh'] },
  electronic: { pattern: 'offbeat', notes: ['root', 'octave'] },
  classical: { pattern: 'alberti', notes: ['root', 'fifth', 'third', 'fifth'] },
  jazz: { pattern: 'walking', notes: ['root', 'third', 'fifth', 'approach'] },
};

// Arpeggio patterns
const ARPEGGIO_PATTERNS: Record<string, number[][]> = {
  up: [[0], [1], [2], [3]],
  down: [[3], [2], [1], [0]],
  upDown: [[0], [1], [2], [3], [2], [1]],
  broken: [[0, 2], [1, 3]],
  spread: [[0], [2], [1], [3]],
};

// Song sections - gives music structure and arc
type SongSection = 'intro' | 'verse' | 'build' | 'climax' | 'outro';

interface SectionConfig {
  melody: boolean;
  chords: boolean;
  bass: boolean;
  pad: boolean;
  drums: 'none' | 'minimal' | 'light' | 'full' | 'building';
  density: number; // 0-1 multiplier for note density
  velocityMod: number; // velocity modifier
}

// Section arrangement per style
const SECTION_CONFIGS: Record<SongSection, SectionConfig> = {
  intro: { melody: false, chords: true, bass: true, pad: true, drums: 'none', density: 0.3, velocityMod: -15 },
  verse: { melody: true, chords: true, bass: true, pad: true, drums: 'light', density: 0.6, velocityMod: -5 },
  build: { melody: true, chords: true, bass: true, pad: true, drums: 'building', density: 0.8, velocityMod: 5 },
  climax: { melody: true, chords: true, bass: true, pad: true, drums: 'full', density: 1.0, velocityMod: 15 },
  outro: { melody: true, chords: false, bass: true, pad: true, drums: 'minimal', density: 0.4, velocityMod: -10 },
};

// Map bar number to song section, accounting for overall song position and extension direction
function getSongSection(
  barNumber: number,
  totalBars: number,
  totalBarsOffset: number = 0,
  extensionDirection: 'continue' | 'build' | 'peak' | 'wind_down' | 'contrast' = 'continue'
): SongSection {
  // For extensions, use the direction to determine section
  if (totalBarsOffset > 0) {
    const localProgress = barNumber / totalBars;

    switch (extensionDirection) {
      case 'build':
        // Steadily build energy
        if (localProgress < 0.3) return 'verse';
        if (localProgress < 0.7) return 'build';
        return 'climax';

      case 'peak':
        // Stay at high energy
        if (localProgress < 0.1) return 'build';
        if (localProgress < 0.85) return 'climax';
        return 'climax'; // Even the end stays intense

      case 'wind_down':
        // Gradually reduce energy
        if (localProgress < 0.2) return 'verse';
        if (localProgress < 0.6) return 'verse';
        return 'outro';

      case 'contrast':
        // Create contrast - opposite of previous energy
        if (localProgress < 0.25) return 'intro'; // Drop down
        if (localProgress < 0.5) return 'verse';
        if (localProgress < 0.75) return 'build';
        return 'climax'; // Build back up

      case 'continue':
      default:
        // Continue naturally - use offset to determine where we are in the overall arc
        const overallProgress = (totalBarsOffset + barNumber) / (totalBarsOffset + totalBars + 32); // Assume ~48 more bars
        if (overallProgress < 0.2) return 'verse';
        if (overallProgress < 0.4) return 'build';
        if (overallProgress < 0.7) return 'climax';
        if (overallProgress < 0.9) return 'build'; // Second build
        return 'outro';
    }
  }

  // First segment - use standard arc
  const progress = barNumber / totalBars;
  if (progress < 0.1) return 'intro';
  if (progress < 0.35) return 'verse';
  if (progress < 0.6) return 'build';
  if (progress < 0.85) return 'climax';
  return 'outro';
}

// Phrase structure for melody
interface Phrase {
  type: 'question' | 'answer';
  bars: number;
  targetResolution: number; // Scale degree to resolve to (0 = root, 2 = 3rd, 4 = 5th)
}

// Get phrase type based on position within 4-bar or 8-bar grouping
function getPhraseType(barNumber: number): Phrase {
  const phraseBar = barNumber % 4;
  if (phraseBar < 2) {
    // Question phrase - end on tension (5th or 2nd)
    return { type: 'question', bars: 2, targetResolution: Math.random() > 0.5 ? 4 : 1 };
  } else {
    // Answer phrase - resolve to stability (root or 3rd)
    return { type: 'answer', bars: 2, targetResolution: Math.random() > 0.6 ? 0 : 2 };
  }
}

// Tension-resolution note mapping
const TENSION_RESOLUTIONS: Record<number, number[]> = {
  // Scale degree -> possible resolution targets
  6: [4, 0],  // 7th resolves down to 5th or root
  5: [4],     // 6th resolves to 5th
  3: [2, 4],  // 4th resolves to 3rd or up to 5th
  1: [0, 2],  // 2nd resolves to root or 3rd
};

// Get approach note to target
function getApproachNote(targetMidi: number, scale: string[], approachType: 'chromatic' | 'scale' | 'enclosure'): number {
  const scaleMidis = scale.map(noteToMidi);

  switch (approachType) {
    case 'chromatic':
      // Half step below or above
      return Math.random() > 0.5 ? targetMidi - 1 : targetMidi + 1;
    case 'scale':
      // Find nearest scale tone below or above
      const below = scaleMidis.filter(m => m < targetMidi).pop() || targetMidi - 2;
      const above = scaleMidis.find(m => m > targetMidi) || targetMidi + 2;
      return Math.random() > 0.5 ? below : above;
    case 'enclosure':
      // Note above then below (returns the first approach note)
      return targetMidi + 1;
    default:
      return targetMidi - 1;
  }
}

// Generate a complete MIDI segment
export function generateSegment(
  options: GenerationOptions = {},
  continuationContext: ContinuationContext | null = null
): GenerationResult {
  const {
    bars = 16,
    key = 'C',
    mode = 'major',
    tempo = 90,
    style = 'ambient',
    totalBarsOffset = 0,
    extensionDirection = 'continue',
  } = options;

  const styleParams = STYLE_PARAMS[style] || STYLE_PARAMS.ambient;
  const scale = getScale(key, mode, 4);

  // Set up tracks
  const melodyTrack = new MidiWriter.Track();
  const chordTrack = new MidiWriter.Track();
  const bassTrack = new MidiWriter.Track();
  const drumTrack = new MidiWriter.Track();
  const padTrack = new MidiWriter.Track();

  // Set tempo
  melodyTrack.setTempo(tempo);

  // Set instruments
  const instruments = getInstrumentsForStyle(style);
  melodyTrack.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: instruments.melody }));
  chordTrack.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: instruments.chords }));
  bassTrack.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: instruments.bass }));
  padTrack.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: instruments.pad }));
  // Drums use channel 10 (9 in 0-indexed), no program change needed

  // Get progression
  const progression = getProgression(style);

  // Initialize state
  let progressionPos = continuationContext?.progressionPosition || 0;
  let dynamics = continuationContext?.dynamics || {
    level: 'medium' as const,
    direction: 'stable' as const,
    velocityTrend: 0
  };

  // Generate or continue motif
  const motif = continuationContext?.motif || generateMotif(scale.length);
  let motifVariation = 0;

  // Track ending state
  const endingNotes: SegmentInfo['endingNotes'] = { melody: [], bass: [], chords: [] };
  let lastMelodyNote = continuationContext?.lastNotes?.melody?.[0]?.note || scale[motif[0]];

  // Generate each bar with section awareness
  for (let bar = 0; bar < bars; bar++) {
    const [chordDegree, chordType] = progression[progressionPos % progression.length];
    const chordNotes = getChordFromDegree(key, mode, chordDegree, chordType, 3);
    const chordNotesHigh = getChordFromDegree(key, mode, chordDegree, chordType, 4);
    const bassRoot = chordNotes[0].replace(/\d+$/, '') + '2';

    // Get current song section and its configuration
    const section = getSongSection(bar, bars, totalBarsOffset, extensionDirection);
    const sectionConfig = SECTION_CONFIGS[section];
    const phrase = getPhraseType(bar);

    // Apply section-based velocity modification
    const baseVelocity = getBaseVelocity(dynamics, bar, bars) + sectionConfig.velocityMod;

    // Determine if we're at a section boundary (for fills)
    const isLastBarOfSection = getSongSection(bar + 1, bars) !== section;
    const is4BarBoundary = (bar + 1) % 4 === 0;

    // Generate drums based on section intensity
    if (sectionConfig.drums !== 'none') {
      generateDrums(drumTrack, bar, style, baseVelocity, dynamics, sectionConfig.drums, isLastBarOfSection);
    }

    // Generate pad/atmosphere based on section
    if (sectionConfig.pad && (style === 'ambient' || style === 'electronic' || section === 'intro' || section === 'outro')) {
      generatePad(padTrack, chordNotesHigh, bar, baseVelocity * (section === 'climax' ? 1.1 : 0.9));
    }

    // Generate chords based on section
    if (sectionConfig.chords) {
      generateChords(chordTrack, chordNotes, bar, baseVelocity, style, styleParams, section);
    }

    // Generate bass
    if (sectionConfig.bass) {
      generateBass(bassTrack, bassRoot, chordNotes, bar, baseVelocity, style, progression, progressionPos, section);
    }

    // Generate melody using motif and phrase structure
    if (sectionConfig.melody) {
      const currentMotif = varyMotif(motif, motifVariation, scale.length);
      const effectiveDensity = styleParams.noteDensity * sectionConfig.density;
      lastMelodyNote = generateMelody(
        melodyTrack,
        scale,
        chordNotes,
        currentMotif,
        bar,
        baseVelocity,
        styleParams,
        lastMelodyNote,
        phrase,
        effectiveDensity,
        style
      );
    }

    // Track ending notes
    if (bar >= bars - 2) {
      endingNotes.melody.push({ note: lastMelodyNote, velocity: baseVelocity });
      endingNotes.bass.push({ note: bassRoot, velocity: baseVelocity });
      endingNotes.chords.push({ notes: chordNotes, velocity: baseVelocity });
    }

    // Advance progression
    const progressionRate = getProgressionRate(style);
    if ((bar + 1) % progressionRate === 0) {
      progressionPos = (progressionPos + 1) % progression.length;
      motifVariation++;
    }

    // Evolve dynamics
    dynamics = evolveDynamics(dynamics, bar, bars);
  }

  // Build MIDI file
  const tracks = [melodyTrack, chordTrack, bassTrack, padTrack, drumTrack];
  const writer = new MidiWriter.Writer(tracks);

  const durationSeconds = (bars * 4 / tempo) * 60;
  const finalChord = progression[(progressionPos - 1 + progression.length) % progression.length];
  const finalChordNotes = getChordFromDegree(key, mode, finalChord[0], finalChord[1], 3);

  const midiData = writer.buildFile();
  const midiBase64 = Buffer.from(midiData).toString('base64');

  return {
    midiData,
    midiBase64,
    segmentInfo: {
      bars,
      durationSeconds,
      endingNotes,
      endingChord: finalChordNotes[0].replace(/\d+$/, ''),
      endingChordType: finalChord[1],
      progressionPosition: progressionPos,
      dynamics,
      motif,
    },
  };
}

// Generate drum track for one bar with section awareness
function generateDrums(
  track: MidiWriter.Track,
  barNumber: number,
  style: string,
  baseVelocity: number,
  dynamics: { direction: string },
  intensity: 'minimal' | 'light' | 'full' | 'building' = 'full',
  addFill: boolean = false
): void {
  const pattern = DRUM_PATTERNS[style] || DRUM_PATTERNS.lofi;
  const ticksPerSixteenth = 32;

  // Intensity multiplier based on dynamics and section
  const intensityMults: Record<string, number> = {
    minimal: 0.6,
    light: 0.8,
    full: 1.0,
    building: 1.15,
  };
  const intensityMult = intensityMults[intensity] *
    (dynamics.direction === 'building' ? 1.1 : dynamics.direction === 'fading' ? 0.9 : 1.0);

  // Pattern density based on intensity
  const densityMult = intensity === 'minimal' ? 0.4 : intensity === 'light' ? 0.7 : 1.0;

  for (let i = 0; i < 16; i++) {
    const tick = barNumber * 512 + i * ticksPerSixteenth;

    // Add fill at end of bar if requested
    if (addFill && i >= 12) {
      // Snare roll fill
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: ['D2'] as MidiWriter.Pitch[],
        duration: '16',
        velocity: humanizeVelocity(Math.floor(baseVelocity * intensityMult * (0.8 + (i - 12) * 0.1)), 5),
        startTick: humanizeTiming(tick, 2),
        channel: 10,
      }));
      // Tom fills
      if (i === 13 || i === 15) {
        track.addEvent(new MidiWriter.NoteEvent({
          pitch: ['G2'] as MidiWriter.Pitch[], // Low tom
          duration: '16',
          velocity: humanizeVelocity(Math.floor(baseVelocity * intensityMult * 0.85), 5),
          startTick: humanizeTiming(tick, 2),
          channel: 10,
        }));
      }
      continue; // Skip normal pattern during fill
    }

    // Kick drum (MIDI note 36)
    if (pattern.kick[i] && (intensity !== 'minimal' || i === 0)) {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: ['C2'] as MidiWriter.Pitch[],
        duration: '16',
        velocity: humanizeVelocity(Math.floor(baseVelocity * intensityMult), 5),
        startTick: humanizeTiming(tick, 2),
        channel: 10,
      }));
    }

    // Snare drum (MIDI note 38) - ghost notes for groove
    if (pattern.snare[i] && Math.random() < densityMult) {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: ['D2'] as MidiWriter.Pitch[],
        duration: '16',
        velocity: humanizeVelocity(Math.floor(baseVelocity * 0.9 * intensityMult), 6),
        startTick: humanizeTiming(tick, 3),
        channel: 10,
      }));
    }
    // Add ghost notes on certain styles
    if ((style === 'lofi' || style === 'jazz') && intensity !== 'minimal' && (i === 6 || i === 10) && Math.random() > 0.5) {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: ['D2'] as MidiWriter.Pitch[],
        duration: '16',
        velocity: humanizeVelocity(Math.floor(baseVelocity * 0.35), 8), // Ghost note - very soft
        startTick: humanizeTiming(tick, 5),
        channel: 10,
      }));
    }

    // Hi-hat - open hi-hat on builds
    if (pattern.hihat[i] && Math.random() < densityMult) {
      const isOffbeat = i % 2 === 1;
      const useOpenHihat = intensity === 'building' && i % 4 === 2;
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [useOpenHihat ? 'A#2' : 'F#2'] as MidiWriter.Pitch[], // Open vs closed hi-hat
        duration: '16',
        velocity: humanizeVelocity(Math.floor((baseVelocity - 20) * (isOffbeat ? 0.7 : 1) * intensityMult), 10),
        startTick: humanizeTiming(tick, 4),
        channel: 10,
      }));
    }

    // Ride cymbal for jazz (MIDI note 51)
    if (pattern.ride?.[i] && Math.random() < densityMult) {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: ['D#3'] as MidiWriter.Pitch[],
        duration: '16',
        velocity: humanizeVelocity(Math.floor(baseVelocity * 0.6 * intensityMult), 8),
        startTick: humanizeTiming(tick, 5),
        channel: 10,
      }));
    }
  }
}

// Generate pad/atmosphere
function generatePad(
  track: MidiWriter.Track,
  chordNotes: string[],
  barNumber: number,
  baseVelocity: number
): void {
  track.addEvent(new MidiWriter.NoteEvent({
    pitch: chordNotes as MidiWriter.Pitch[],
    duration: '1',
    velocity: humanizeVelocity(Math.floor(baseVelocity * 0.4), 5),
    startTick: barNumber * 512,
  }));
}

// Generate chords with style-appropriate voicings and section awareness
function generateChords(
  track: MidiWriter.Track,
  chordNotes: string[],
  barNumber: number,
  baseVelocity: number,
  style: string,
  styleParams: StyleParams,
  section: SongSection = 'verse'
): void {
  const tick = barNumber * 512;

  // Sparser chords in intro/outro, fuller in climax
  const sectionSparsity = section === 'intro' ? 0.5 : section === 'outro' ? 0.6 : section === 'climax' ? 1.2 : 1.0;

  if (style === 'ambient') {
    // Slow arpeggios - even slower in intro
    const arpPattern = section === 'climax' ? ARPEGGIO_PATTERNS.upDown : ARPEGGIO_PATTERNS.up;
    const noteDuration = section === 'intro' ? 256 : 128; // Half notes in intro, 8th notes otherwise
    arpPattern.forEach((indices, i) => {
      const notes = indices.map(idx => chordNotes[idx % chordNotes.length]);
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: notes as MidiWriter.Pitch[],
        duration: section === 'intro' ? '2' : '4',
        velocity: humanizeVelocity(Math.floor(baseVelocity * 0.6 * sectionSparsity), 8),
        startTick: humanizeTiming(tick + i * noteDuration, 10),
      }));
    });
  } else if (style === 'electronic') {
    // Fast arpeggios - build intensity toward climax
    const arpPattern = section === 'climax' ? ARPEGGIO_PATTERNS.upDown : ARPEGGIO_PATTERNS.up;
    const noteCount = section === 'intro' ? 4 : section === 'climax' ? 16 : 8;
    for (let i = 0; i < noteCount; i++) {
      const noteIdx = arpPattern[i % arpPattern.length][0];
      const note = chordNotes[noteIdx % chordNotes.length];
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [note] as MidiWriter.Pitch[],
        duration: '16',
        velocity: humanizeVelocity(Math.floor(baseVelocity * 0.7 * sectionSparsity), 10),
        startTick: humanizeTiming(tick + i * (512 / noteCount), 3),
      }));
    }
  } else if (style === 'lofi' || style === 'jazz') {
    // Syncopated chord hits - with swing feel
    const hits = section === 'intro' ? [0, 8] : section === 'climax' ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 3, 6, 10, 14];
    hits.forEach(pos => {
      if (Math.random() > 0.3 * (2 - sectionSparsity)) {
        // Add swing to offbeats (delay slightly)
        const swingDelay = (style === 'jazz' && pos % 2 === 1) ? 8 : 0;
        track.addEvent(new MidiWriter.NoteEvent({
          pitch: chordNotes as MidiWriter.Pitch[],
          duration: '8',
          velocity: humanizeVelocity(Math.floor(baseVelocity * 0.65 * sectionSparsity), 12),
          startTick: humanizeTiming(tick + pos * 32 + swingDelay, 8),
        }));
      }
    });
  } else {
    // Block chords (classical, default)
    if (styleParams.useSustain || section === 'intro' || section === 'outro') {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: chordNotes as MidiWriter.Pitch[],
        duration: '1',
        velocity: humanizeVelocity(Math.floor(baseVelocity * 0.7 * sectionSparsity), 5),
        startTick: tick,
      }));
    } else {
      // Quarter note hits with varying intensity
      const beats = section === 'climax' ? 4 : section === 'verse' ? 4 : 2;
      for (let beat = 0; beat < beats; beat++) {
        track.addEvent(new MidiWriter.NoteEvent({
          pitch: chordNotes as MidiWriter.Pitch[],
          duration: '4',
          velocity: humanizeVelocity(Math.floor(baseVelocity * 0.65 * sectionSparsity), 8),
          startTick: humanizeTiming(tick + beat * 128, 5),
        }));
      }
    }
  }
}

// Generate bass line with section awareness
function generateBass(
  track: MidiWriter.Track,
  bassRoot: string,
  chordNotes: string[],
  barNumber: number,
  baseVelocity: number,
  style: string,
  progression: Array<[number, string]>,
  progressionPos: number,
  section: SongSection = 'verse'
): void {
  const tick = barNumber * 512;
  const rootNote = bassRoot.replace(/\d+$/, '');
  const octave = 2;

  // Get chord tones in bass octave
  const root = rootNote + octave;
  const third = chordNotes[1]?.replace(/\d+$/, '') + octave;
  const fifth = chordNotes[2]?.replace(/\d+$/, '') + octave;
  const octaveUp = rootNote + (octave + 1);

  // Get next chord root for approach notes
  const nextChord = progression[(progressionPos + 1) % progression.length];
  const nextRootIdx = NOTES.indexOf(rootNote as typeof NOTES[number]);
  const approachNote = NOTES[(nextRootIdx + 11) % 12] + octave; // Half step below next root

  const bassVelocity = Math.floor(baseVelocity * 0.85);

  // Simpler bass in intro/outro
  if (section === 'intro' || section === 'outro') {
    // Sustained root notes only
    track.addEvent(new MidiWriter.NoteEvent({
      pitch: [root] as MidiWriter.Pitch[],
      duration: '1',
      velocity: humanizeVelocity(bassVelocity - 10, 5),
      startTick: tick,
    }));
    return;
  }

  if (style === 'jazz') {
    // Walking bass with chromatic approaches
    const walkingNotes = section === 'climax'
      ? [root, third, fifth, approachNote] // Full walking in climax
      : [root, fifth, root, approachNote]; // Simpler in verse/build
    walkingNotes.forEach((note, i) => {
      // Swing feel - delay beats 2 and 4 slightly
      const swingDelay = (i === 1 || i === 3) ? 12 : 0;
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [note] as MidiWriter.Pitch[],
        duration: '4',
        velocity: humanizeVelocity(bassVelocity, 8),
        startTick: humanizeTiming(tick + i * 128 + swingDelay, 10),
      }));
    });
  } else if (style === 'lofi') {
    // Groovy pattern - lazy timing (slightly late)
    const lazyOffset = 5; // Slightly behind the beat for that lofi feel
    const pattern = section === 'climax'
      ? [
          { pos: 0, note: root, dur: '8' },
          { pos: 2, note: root, dur: '16' },
          { pos: 4, note: third, dur: '8' },
          { pos: 6, note: fifth, dur: '8' },
          { pos: 8, note: root, dur: '8' },
          { pos: 10, note: fifth, dur: '16' },
          { pos: 12, note: third, dur: '8' },
          { pos: 14, note: root, dur: '8' },
        ]
      : [
          { pos: 0, note: root, dur: '8' },
          { pos: 3, note: root, dur: '16' },
          { pos: 6, note: fifth, dur: '8' },
          { pos: 8, note: root, dur: '8' },
          { pos: 11, note: third, dur: '16' },
          { pos: 14, note: fifth, dur: '8' },
        ];
    pattern.forEach(({ pos, note, dur }) => {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [note] as MidiWriter.Pitch[],
        duration: dur as MidiWriter.Duration,
        velocity: humanizeVelocity(bassVelocity, 10),
        startTick: humanizeTiming(tick + pos * 32 + lazyOffset, 8),
      }));
    });
  } else if (style === 'electronic') {
    // Offbeat bass - more intense in climax
    const noteCount = section === 'climax' ? 16 : 8;
    for (let i = 0; i < noteCount; i++) {
      const note = i % 2 === 0 ? root : (section === 'climax' && i % 4 === 1 ? fifth : octaveUp);
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [note] as MidiWriter.Pitch[],
        duration: section === 'climax' ? '16' : '8',
        velocity: humanizeVelocity(bassVelocity + (section === 'climax' ? 15 : 10), 5),
        startTick: humanizeTiming(tick + i * (512 / noteCount), 3),
      }));
    }
  } else if (style === 'classical') {
    // Alberti bass pattern
    const alberti = section === 'climax'
      ? [root, fifth, third, fifth, root, third, fifth, third] // More active in climax
      : [root, fifth, third, fifth, root, fifth, third, fifth];
    alberti.forEach((note, i) => {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [note] as MidiWriter.Pitch[],
        duration: '8',
        velocity: humanizeVelocity(bassVelocity - 10, 8),
        startTick: humanizeTiming(tick + i * 64, 5),
      }));
    });
  } else {
    // Ambient - long sustained notes with octave swells in climax
    if (section === 'climax') {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [root] as MidiWriter.Pitch[],
        duration: '2',
        velocity: humanizeVelocity(bassVelocity - 10, 5),
        startTick: tick,
      }));
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [octaveUp] as MidiWriter.Pitch[],
        duration: '2',
        velocity: humanizeVelocity(bassVelocity - 5, 5),
        startTick: tick + 256,
      }));
    } else {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [root] as MidiWriter.Pitch[],
        duration: '1',
        velocity: humanizeVelocity(bassVelocity - 15, 5),
        startTick: tick,
      }));
    }
  }
}

// Generate melody using motif with phrase-based structure and tension-resolution
function generateMelody(
  track: MidiWriter.Track,
  scale: string[],
  chordNotes: string[],
  motif: number[],
  barNumber: number,
  baseVelocity: number,
  styleParams: StyleParams,
  lastNote: string,
  phrase: Phrase = { type: 'question', bars: 2, targetResolution: 4 },
  effectiveDensity: number = 0.6,
  style: string = 'ambient'
): string {
  const tick = barNumber * 512;
  const octaveRange = styleParams.octaveRange;

  // Get chord tones for emphasis
  const chordMidis = chordNotes.map(noteToMidi).map(n => n % 12);

  // Decide where to play notes based on density and phrase type
  // Question phrases can be more active, answer phrases should resolve and breathe
  const isEndOfPhrase = (barNumber + 1) % 2 === 0;
  const phraseDensityMod = phrase.type === 'answer' && isEndOfPhrase ? 0.7 : 1.0;

  // Strong and weak beat positions
  const strongBeats = [0, 8]; // Beats 1 and 3
  const weakBeats = [2, 4, 6, 10, 12, 14]; // Offbeats
  const allPositions = [0, 2, 4, 6, 8, 10, 12, 14];

  // Filter positions based on density - always include some strong beats
  const notePositions = allPositions.filter((pos, i) => {
    const isStrong = strongBeats.includes(pos);
    const chance = isStrong ? effectiveDensity * 1.3 : effectiveDensity * phraseDensityMod;
    return Math.random() < chance;
  });

  // Add breathing room at end of answer phrases (rest)
  if (phrase.type === 'answer' && isEndOfPhrase && notePositions.includes(14)) {
    notePositions.pop(); // Remove last note for a rest
  }

  // Use motif to guide note selection
  let currentNote = lastNote;
  let motifIdx = 0;

  // Track phrase target for resolution
  const phraseTargetScaleDegree = phrase.targetResolution;
  const phraseTargetNote = scale[phraseTargetScaleDegree % scale.length];
  const phraseTargetMidi = noteToMidi(phraseTargetNote);

  notePositions.forEach((pos, i) => {
    const isLastNoteOfPhrase = i === notePositions.length - 1 && isEndOfPhrase;
    const isStrongBeat = strongBeats.includes(pos);

    // Get next note from motif, approach chord tone, or resolve phrase
    let targetScaleDegree: number;
    let targetMidi: number;

    if (isLastNoteOfPhrase) {
      // End of phrase - resolve to phrase target
      targetScaleDegree = phraseTargetScaleDegree;
      targetMidi = phraseTargetMidi;
    } else if (isStrongBeat) {
      // Strong beats - prefer chord tones
      const chordToneIdx = Math.floor(Math.random() * chordNotes.length);
      const chordTone = chordNotes[chordToneIdx];
      targetScaleDegree = scale.findIndex(s => s.replace(/\d+$/, '') === chordTone.replace(/\d+$/, ''));
      if (targetScaleDegree === -1) targetScaleDegree = motifIdx < motif.length ? motif[motifIdx++] : 0;
      targetMidi = noteToMidi(scale[targetScaleDegree % scale.length]);
    } else if (motifIdx < motif.length && Math.random() > 0.4) {
      // Use motif
      targetScaleDegree = motif[motifIdx];
      motifIdx++;
      targetMidi = noteToMidi(scale[targetScaleDegree % scale.length]);
    } else {
      // Approach the next strong beat target or use passing tone
      const currentMidi = noteToMidi(currentNote);
      const nextStrongBeatIdx = notePositions.findIndex((p, idx) => idx > i && strongBeats.includes(p));

      if (nextStrongBeatIdx !== -1) {
        // Approach the target on the next strong beat
        const nextChordTone = chordNotes[0]; // Root
        const nextTargetMidi = noteToMidi(nextChordTone);
        // Step towards it
        targetMidi = currentMidi + (nextTargetMidi > currentMidi ? 1 : -1);
      } else {
        // Random scale tone, prefer stepwise motion
        const step = Math.random() > 0.5 ? 1 : -1;
        targetMidi = currentMidi + step * (Math.random() > 0.7 ? 2 : 1);
      }
      targetScaleDegree = scale.findIndex(s => noteToMidi(s) % 12 === targetMidi % 12);
      if (targetScaleDegree === -1) targetScaleDegree = 0;
    }

    // Get actual note with octave adjustment
    let note = scale[targetScaleDegree % scale.length];
    let midi = targetMidi || noteToMidi(note);

    // Adjust octave to be in range and close to previous note
    const prevMidi = noteToMidi(currentNote);
    while (midi < (octaveRange[0] + 1) * 12) midi += 12;
    while (midi > (octaveRange[1] + 1) * 12 + 11) midi -= 12;

    // Prefer stepwise motion - adjust if too far (unless it's a dramatic moment)
    const maxInterval = style === 'jazz' ? 9 : style === 'classical' ? 8 : 6;
    if (Math.abs(midi - prevMidi) > maxInterval && Math.random() > 0.15) {
      const direction = midi > prevMidi ? 1 : -1;
      midi = prevMidi + direction * (Math.random() > 0.5 ? 3 : 2);
    }

    note = midiToNote(midi);

    // Determine velocity with phrase-level dynamics
    const isChordTone = chordMidis.includes(midi % 12);
    const isDownbeat = pos === 0 || pos === 8;
    let velocity = baseVelocity;

    // Chord tones and downbeats get emphasis
    if (isChordTone) velocity += 8;
    if (isDownbeat) velocity += 5;

    // Phrase dynamics - question phrases crescendo, answer phrases decrescendo
    const phraseProgress = i / Math.max(1, notePositions.length - 1);
    if (phrase.type === 'question') {
      velocity += Math.floor(phraseProgress * 8); // Build to end
    } else {
      velocity -= Math.floor(phraseProgress * 6); // Settle to end
    }

    // Add style-specific timing feel
    let timingOffset = 0;
    if (style === 'jazz' && !isDownbeat) {
      timingOffset = 8; // Swing feel - delay offbeats
    } else if (style === 'lofi') {
      timingOffset = Math.floor(Math.random() * 6) + 2; // Lazy, behind the beat
    }

    velocity = humanizeVelocity(velocity, 10);

    // Determine duration based on position and style
    let duration: MidiWriter.Duration;
    if (isLastNoteOfPhrase && phrase.type === 'answer') {
      duration = '4'; // Hold the resolution note
    } else if (isDownbeat) {
      duration = Math.random() > 0.5 ? '4' : '8';
    } else {
      const durations: MidiWriter.Duration[] = style === 'ambient' ? ['4', '2', '4'] : ['8', '8', '4', '8', '16'];
      duration = durations[Math.floor(Math.random() * durations.length)];
    }

    track.addEvent(new MidiWriter.NoteEvent({
      pitch: [note] as MidiWriter.Pitch[],
      duration,
      velocity,
      startTick: humanizeTiming(tick + pos * 32 + timingOffset, style === 'lofi' ? 10 : 6),
    }));

    currentNote = note;
  });

  return currentNote;
}

// Get instruments for style
function getInstrumentsForStyle(style: string): Record<string, number> {
  const instruments: Record<string, Record<string, number>> = {
    ambient: { melody: 89, chords: 52, bass: 39, pad: 92 },    // Warm Pad, Choir, Synth Bass, Space Pad
    lofi: { melody: 5, chords: 1, bass: 33, pad: 89 },         // EP, Piano, Finger Bass, Warm Pad
    electronic: { melody: 81, chords: 63, bass: 38, pad: 95 }, // Square Lead, Synth Brass, Synth Bass 1, Sweep Pad
    classical: { melody: 41, chords: 49, bass: 43, pad: 49 },  // Violin, Strings, Cello, Strings
    jazz: { melody: 66, chords: 1, bass: 33, pad: 52 },        // Alto Sax, Piano, Finger Bass, Choir
  };
  return instruments[style] || instruments.ambient;
}

// Get base velocity based on dynamics and position
function getBaseVelocity(
  dynamics: { level: string; velocityTrend: number },
  currentBar: number,
  totalBars: number
): number {
  const levelMap: Record<string, number> = { soft: 55, medium: 72, loud: 88 };
  const base = levelMap[dynamics.level] || 72;

  // Add phrase-level dynamics (slight crescendo/decrescendo within 4-bar phrases)
  const phrasePos = currentBar % 4;
  const phraseDynamic = phrasePos < 2 ? phrasePos * 3 : (3 - phrasePos) * 3;

  // Add overall arc
  const progress = currentBar / totalBars;
  const arcDynamic = Math.sin(progress * Math.PI) * 8;

  return Math.min(100, Math.max(40, base + dynamics.velocityTrend * 10 + phraseDynamic + arcDynamic));
}

// Get progression rate
function getProgressionRate(style: string): number {
  const rates: Record<string, number> = {
    ambient: 4,
    lofi: 2,
    electronic: 2,
    classical: 1,
    jazz: 1,
  };
  return rates[style] || 2;
}

// Evolve dynamics
function evolveDynamics(
  dynamics: SegmentInfo['dynamics'],
  currentBar: number,
  totalBars: number
): SegmentInfo['dynamics'] {
  const progress = currentBar / totalBars;
  const newDynamics = { ...dynamics };

  if (progress < 0.2) {
    newDynamics.direction = 'building';
    newDynamics.velocityTrend = Math.min(1, dynamics.velocityTrend + 0.15);
  } else if (progress < 0.7) {
    newDynamics.direction = 'stable';
    newDynamics.velocityTrend += (Math.random() - 0.5) * 0.1;
  } else if (progress < 0.9) {
    newDynamics.direction = 'building';
    newDynamics.velocityTrend = Math.min(1.2, dynamics.velocityTrend + 0.1);
  } else {
    newDynamics.direction = 'fading';
    newDynamics.velocityTrend = Math.max(-0.3, dynamics.velocityTrend - 0.1);
  }

  newDynamics.velocityTrend = Math.max(-1, Math.min(1.2, newDynamics.velocityTrend));

  if (newDynamics.velocityTrend > 0.6) newDynamics.level = 'loud';
  else if (newDynamics.velocityTrend < -0.2) newDynamics.level = 'soft';
  else newDynamics.level = 'medium';

  return newDynamics;
}

// Helper to get scale
function getScale(root: string, mode: string, octave: number): string[] {
  const rootIdx = NOTES.indexOf(root as typeof NOTES[number]);
  const patterns: Record<string, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    pentatonic: [0, 2, 4, 7, 9],
  };
  const pattern = patterns[mode] || patterns.major;

  return pattern.map(interval => {
    const noteIdx = (rootIdx + interval) % 12;
    const noteOctave = octave + Math.floor((rootIdx + interval) / 12);
    return NOTES[noteIdx] + noteOctave;
  });
}
