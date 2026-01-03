// Session state management
import { v4 as uuidv4 } from 'uuid';
import type { Session, Segment, MusicalState, GenerationParams, JourneyStep, ExtensionDirection } from '../../shared/types.js';
import type { SegmentInfo } from './generator.js';

// In-memory session storage
const sessions = new Map<string, Session>();

// Create initial musical state
export function createInitialState(params: GenerationParams): MusicalState {
  return {
    key: params.key,
    mode: params.mode,
    tempo: params.tempo,
    style: params.style,
    progressionPosition: 0,
    currentChord: null,
    currentChordType: null,
    lastNotes: {
      melody: [],
      bass: [],
      chords: [],
    },
    dynamics: {
      level: 'medium',
      direction: 'stable',
      velocityTrend: 0,
    },
    totalBars: 0,
    totalDurationSeconds: 0,
  };
}

// Create a new session
export function createSession(projectName: string, params: GenerationParams): Session {
  const session: Session = {
    id: uuidv4(),
    projectName,
    state: createInitialState(params),
    segments: [],
    journey: [],  // Track style/key changes for infinite mode
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  sessions.set(session.id, session);
  return session;
}

// Get session by ID
export function getSession(sessionId: string): Session | null {
  return sessions.get(sessionId) || null;
}

// Update session after generating a segment
export function updateSessionWithSegment(
  sessionId: string,
  midiBase64: string,
  segmentInfo: SegmentInfo
): Segment {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Create segment record
  const segment: Segment = {
    id: uuidv4(),
    filename: `${session.projectName}-${String(session.segments.length + 1).padStart(3, '0')}.mid`,
    bars: segmentInfo.bars,
    durationSeconds: segmentInfo.durationSeconds,
    midiBase64,
    generatedAt: new Date().toISOString(),
  };

  // Update session state
  session.segments.push(segment);
  session.state.totalBars += segmentInfo.bars;
  session.state.totalDurationSeconds += segmentInfo.durationSeconds;
  session.state.currentChord = segmentInfo.endingChord;
  session.state.currentChordType = segmentInfo.endingChordType;
  session.state.progressionPosition = segmentInfo.progressionPosition;
  session.state.lastNotes = segmentInfo.endingNotes;
  session.state.dynamics = segmentInfo.dynamics;
  session.updatedAt = new Date().toISOString();

  return segment;
}

// Get continuation context from session
export function getContinuationContext(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session || session.state.totalBars === 0) {
    return null;
  }

  return {
    key: session.state.key,
    mode: session.state.mode,
    tempo: session.state.tempo,
    style: session.state.style,
    progressionPosition: session.state.progressionPosition,
    currentChord: session.state.currentChord,
    currentChordType: session.state.currentChordType,
    lastNotes: session.state.lastNotes,
    dynamics: session.state.dynamics,
    totalBars: session.state.totalBars,
  };
}

// Add a journey step (for tracking infinite mode decisions)
export function addJourneyStep(
  sessionId: string,
  step: Omit<JourneyStep, 'timestamp'>
): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.journey.push({
    ...step,
    timestamp: new Date().toISOString(),
  });
}

// Get journey summary for AI decisions (last N steps)
export function getJourneySummary(sessionId: string, maxSteps: number = 5): JourneyStep[] {
  const session = sessions.get(sessionId);
  if (!session) return [];

  return session.journey.slice(-maxSteps);
}

// Reset session (clear segments but keep settings)
export function resetSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.segments = [];
  session.journey = [];  // Clear journey too
  session.state.totalBars = 0;
  session.state.totalDurationSeconds = 0;
  session.state.progressionPosition = 0;
  session.state.currentChord = null;
  session.state.currentChordType = null;
  session.state.lastNotes = { melody: [], bass: [], chords: [] };
  session.state.dynamics = { level: 'medium', direction: 'stable', velocityTrend: 0 };
  session.updatedAt = new Date().toISOString();

  return session;
}

// Delete session
export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

// Format duration as MM:SS
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Cleanup old sessions (call periodically)
export function cleanupOldSessions(maxAgeMs = 3600000): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    const updatedAt = new Date(session.updatedAt).getTime();
    if (now - updatedAt > maxAgeMs) {
      sessions.delete(id);
    }
  }
}
