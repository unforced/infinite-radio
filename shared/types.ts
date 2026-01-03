// Shared types between client and server

export interface GenerationParams {
  key: string;
  mode: string;
  tempo: number;
  style: string;
  bars: number;
}

// Current musical state - simpler for Strudel patterns
export interface MusicalState {
  key: string;
  mode: string;
  tempo: number;           // BPM
  style: string;
  energy: 'low' | 'medium' | 'high';
  totalPatternsPlayed: number;
  uptimeSeconds: number;
}

// A Strudel pattern segment - runs until replaced
export interface Segment {
  id: string;
  patternCode: string;     // Strudel pattern code
  style: string;           // Style description
  key: string;             // Musical key
  mode: string;            // Scale mode
  tempo: number;           // BPM (cycles per second * 60)
  reasoning: string;       // AI's reasoning for this pattern
  generatedAt: string;
}

// Extension directions for continuing music
export type ExtensionDirection = 'continue' | 'build' | 'peak' | 'wind_down' | 'contrast';

// Journey tracking for the radio station
export interface JourneyStep {
  style: string;
  mode: string;
  key: string;
  tempo: number;
  bars: number;
  direction: ExtensionDirection;
  timestamp: string;
}

// AI decision for next segment
export interface AIDecision {
  action: 'continue' | 'shift_style' | 'shift_energy' | 'modulate' | 'new_piece';
  style: string;
  mode: string;
  key: string;
  tempo: number;
  direction: ExtensionDirection;
  bars: number;
  reasoning: string;
}

// Chat message from listeners
export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

// Global radio station state (shared by all listeners)
export interface RadioState {
  currentPattern: Segment | null;  // Currently playing pattern
  patternHistory: Segment[];       // Recent patterns for context
  journey: JourneyStep[];
  state: MusicalState;
  isGenerating: boolean;
  listeners: number;
  startedAt: string;
}

// WebSocket message types
export type ClientMessage =
  | { type: 'join'; username: string }  // Join the radio station
  | { type: 'chat'; message: string }   // Send a chat message
  | { type: 'sync' };                   // Request current state sync

export type ServerMessage =
  | { type: 'welcome'; radioState: RadioState; recentChat: ChatMessage[] }
  | { type: 'pattern'; pattern: Segment }  // New pattern to play
  | { type: 'chat'; message: ChatMessage }
  | { type: 'ai_status'; isGenerating: boolean; reasoning: string | null }
  | { type: 'listeners'; count: number }
  | { type: 'error'; error: string };
