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
    energy: 'low' | 'medium' | 'high';
    totalPatternsPlayed: number;
    uptimeSeconds: number;
}
export interface Segment {
    id: string;
    patternCode: string;
    style: string;
    key: string;
    mode: string;
    tempo: number;
    reasoning: string;
    generatedAt: string;
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
export interface ChatMessage {
    id: string;
    username: string;
    message: string;
    timestamp: string;
}
export interface RadioState {
    currentPattern: Segment | null;
    patternHistory: Segment[];
    journey: JourneyStep[];
    state: MusicalState;
    isGenerating: boolean;
    listeners: number;
    startedAt: string;
}
export type ClientMessage = {
    type: 'join';
    username: string;
} | {
    type: 'chat';
    message: string;
} | {
    type: 'sync';
};
export type ServerMessage = {
    type: 'welcome';
    radioState: RadioState;
    recentChat: ChatMessage[];
} | {
    type: 'pattern';
    pattern: Segment;
} | {
    type: 'chat';
    message: ChatMessage;
} | {
    type: 'ai_status';
    isGenerating: boolean;
    reasoning: string | null;
} | {
    type: 'listeners';
    count: number;
} | {
    type: 'error';
    error: string;
};
//# sourceMappingURL=types.d.ts.map