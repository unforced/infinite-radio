export interface GenerationParams {
    key: string;
    mode: string;
    tempo: number;
    style: string;
    bars: number;
}
export interface MusicalState {
    key: string;
    mode: string;
    tempo: number;
    style: string;
    progressionPosition: number;
    currentChord: string | null;
    currentChordType: string | null;
    lastNotes: {
        melody: Array<{
            note: string;
            velocity: number;
        }>;
        bass: Array<{
            note: string;
            velocity: number;
        }>;
        chords: Array<{
            notes: string[];
            velocity: number;
        }>;
    };
    dynamics: {
        level: 'soft' | 'medium' | 'loud';
        direction: 'building' | 'fading' | 'stable';
        velocityTrend: number;
    };
    totalBars: number;
    totalDurationSeconds: number;
}
export interface Segment {
    id: string;
    filename: string;
    bars: number;
    durationSeconds: number;
    midiBase64: string;
    generatedAt: string;
}
export interface Session {
    id: string;
    projectName: string;
    state: MusicalState;
    segments: Segment[];
    journey: JourneyStep[];
    createdAt: string;
    updatedAt: string;
}
export type ExtensionDirection = 'continue' | 'build' | 'peak' | 'wind_down' | 'contrast';
export interface JourneyStep {
    style: string;
    mode: string;
    key: string;
    tempo: number;
    bars: number;
    direction: ExtensionDirection;
    timestamp: string;
}
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
export type ClientMessage = {
    type: 'generate';
    params: GenerationParams;
    prompt?: string;
} | {
    type: 'extend';
    bars?: number;
    prompt?: string;
    direction?: ExtensionDirection;
    style?: string;
    mode?: string;
} | {
    type: 'auto_extend';
} | {
    type: 'status';
} | {
    type: 'reset';
};
export type ServerMessage = {
    type: 'session';
    session: Session;
} | {
    type: 'generating';
    message: string;
} | {
    type: 'segment';
    segment: Segment;
} | {
    type: 'status';
    session: Session;
} | {
    type: 'error';
    error: string;
} | {
    type: 'thinking';
    content: string;
} | {
    type: 'ai_decision';
    decision: AIDecision;
};
//# sourceMappingURL=types.d.ts.map