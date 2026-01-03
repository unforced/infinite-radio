// Music theory fundamentals for MIDI generation

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type NoteName = typeof NOTES[number];

// Scale patterns (semitone intervals from root)
export const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

// Chord patterns (intervals from root)
export const CHORDS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

// Common chord progressions by style (scale degrees, 0-indexed)
export const PROGRESSIONS: Record<string, Array<[number, string]>> = {
  pop: [
    [0, 'major'], [5, 'major'], [3, 'minor'], [4, 'major'],  // I-V-vi-IV
  ],
  jazz: [
    [1, 'min7'], [4, 'dom7'], [0, 'maj7'], [0, 'maj7'],      // ii-V-I
  ],
  blues: [
    [0, 'dom7'], [0, 'dom7'], [0, 'dom7'], [0, 'dom7'],
    [3, 'dom7'], [3, 'dom7'], [0, 'dom7'], [0, 'dom7'],
    [4, 'dom7'], [3, 'dom7'], [0, 'dom7'], [4, 'dom7'],
  ],
  ambient: [
    [0, 'maj7'], [2, 'minor'], [4, 'major'], [3, 'minor'],
  ],
  lofi: [
    [0, 'maj7'], [3, 'min7'], [4, 'dom7'], [0, 'maj7'],
  ],
  classical: [
    [0, 'major'], [3, 'major'], [4, 'major'], [0, 'major'],  // I-IV-V-I
  ],
  electronic: [
    [0, 'minor'], [5, 'minor'], [3, 'major'], [4, 'major'],
  ],
};

// Rhythm patterns (1 = hit, 0 = rest, subdivided into 16th notes per bar)
export const RHYTHM_PATTERNS: Record<string, number[]> = {
  straight: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  offbeat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
  syncopated: [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0],
  driving: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  sparse: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
  dense: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
  triplet: [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,1],
};

// Convert note name to MIDI number
export function noteToMidi(note: string): number {
  const match = note.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 60; // Default to middle C
  const [, noteName, octave] = match;
  const noteIndex = NOTES.indexOf(noteName as NoteName);
  return noteIndex + (parseInt(octave) + 1) * 12;
}

// Convert MIDI number to note name
export function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return NOTES[noteIndex] + octave;
}

// Get scale notes for a given root and scale type
export function getScale(root: string, scaleType: string, octave = 4): string[] {
  const rootIndex = NOTES.indexOf(root as NoteName);
  const pattern = SCALES[scaleType] || SCALES.major;
  return pattern.map(interval => {
    const noteIndex = (rootIndex + interval) % 12;
    const noteOctave = octave + Math.floor((rootIndex + interval) / 12);
    return NOTES[noteIndex] + noteOctave;
  });
}

// Get chord notes for a given root and chord type
export function getChord(root: string, chordType: string, octave = 4): string[] {
  const rootIndex = NOTES.indexOf(root as NoteName);
  const pattern = CHORDS[chordType] || CHORDS.major;
  return pattern.map(interval => {
    const noteIndex = (rootIndex + interval) % 12;
    const noteOctave = octave + Math.floor((rootIndex + interval) / 12);
    return NOTES[noteIndex] + noteOctave;
  });
}

// Get chord from scale degree
export function getChordFromDegree(
  root: string,
  scaleType: string,
  degree: number,
  chordType: string,
  octave = 4
): string[] {
  const scale = SCALES[scaleType] || SCALES.major;
  const rootIndex = NOTES.indexOf(root as NoteName);
  const chordRootInterval = scale[degree % scale.length];
  const chordRootIndex = (rootIndex + chordRootInterval) % 12;
  const chordRoot = NOTES[chordRootIndex];
  return getChord(chordRoot, chordType, octave);
}

// Generate a melody note that fits the current chord/scale
export function getNextMelodicNote(
  currentNote: string,
  scale: string[],
  chord: string[],
  direction = 0,
  leap = false
): string {
  const currentMidi = noteToMidi(currentNote);
  const scaleNotes = scale.map(noteToMidi);

  // Find nearby scale notes
  const nearbyNotes: number[] = [];
  for (let offset = -12; offset <= 12; offset++) {
    const midi = currentMidi + offset;
    if (scaleNotes.some(n => midi % 12 === n % 12)) {
      nearbyNotes.push(midi);
    }
  }

  // Weight notes based on direction preference and chord tones
  const chordMidis = chord.map(noteToMidi).map(n => n % 12);
  const weighted = nearbyNotes.map(midi => {
    let weight = 1;

    // Prefer chord tones
    if (chordMidis.includes(midi % 12)) weight += 2;

    // Apply direction preference
    if (direction > 0 && midi > currentMidi) weight += 1;
    if (direction < 0 && midi < currentMidi) weight += 1;

    // Prefer stepwise motion unless leap requested
    const interval = Math.abs(midi - currentMidi);
    if (!leap && interval <= 2) weight += 2;
    if (leap && interval >= 3 && interval <= 7) weight += 2;

    return { midi, weight };
  });

  // Weighted random selection
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;
  for (const { midi, weight } of weighted) {
    random -= weight;
    if (random <= 0) return midiToNote(midi);
  }

  return currentNote;
}

// Get a chord progression for a style
export function getProgression(style: string): Array<[number, string]> {
  return PROGRESSIONS[style] || PROGRESSIONS.pop;
}

// Style-specific parameters
export interface StyleParams {
  tempo: [number, number];
  noteDensity: number;
  velocityRange: [number, number];
  octaveRange: [number, number];
  preferredScales: string[];
  rhythmPatterns: string[];
  useSustain: boolean;
}

export const STYLE_PARAMS: Record<string, StyleParams> = {
  ambient: {
    tempo: [60, 80],
    noteDensity: 0.3,
    velocityRange: [40, 80],
    octaveRange: [3, 5],
    preferredScales: ['major', 'dorian'],
    rhythmPatterns: ['sparse', 'straight'],
    useSustain: true,
  },
  lofi: {
    tempo: [70, 90],
    noteDensity: 0.5,
    velocityRange: [50, 90],
    octaveRange: [3, 5],
    preferredScales: ['pentatonic', 'dorian'],
    rhythmPatterns: ['syncopated', 'offbeat'],
    useSustain: true,
  },
  electronic: {
    tempo: [120, 140],
    noteDensity: 0.7,
    velocityRange: [70, 110],
    octaveRange: [2, 6],
    preferredScales: ['minor', 'minorPentatonic'],
    rhythmPatterns: ['driving', 'syncopated'],
    useSustain: false,
  },
  classical: {
    tempo: [80, 120],
    noteDensity: 0.6,
    velocityRange: [50, 100],
    octaveRange: [3, 6],
    preferredScales: ['major', 'minor'],
    rhythmPatterns: ['straight', 'triplet'],
    useSustain: true,
  },
  jazz: {
    tempo: [100, 140],
    noteDensity: 0.6,
    velocityRange: [60, 100],
    octaveRange: [3, 5],
    preferredScales: ['dorian', 'mixolydian'],
    rhythmPatterns: ['syncopated', 'triplet'],
    useSustain: true,
  },
};
