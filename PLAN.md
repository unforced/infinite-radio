# MIDI Generator App - Implementation Plan

## Overview

A full-stack web application that generates MIDI music using Claude AI, with in-browser playback. The app supports continuous generation where each new segment flows naturally from the previous one.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Controls   │  │  Visualizer │  │   MIDI Player       │  │
│  │  (key,tempo │  │  (piano     │  │   (Tone.js +        │  │
│  │   style)    │  │   roll)     │  │   @tonejs/midi)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js Backend                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Claude Agent SDK                        │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │  Custom MCP Tool: generate_midi             │    │    │
│  │  │  - Takes: key, mode, tempo, style, bars     │    │    │
│  │  │  - Uses: music-theory.js, generator.js      │    │    │
│  │  │  - Returns: MIDI data as base64             │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              State Management                        │    │
│  │  - Session tracking (per user/browser)              │    │
│  │  - Musical state for continuation                   │    │
│  │  - Generated segments history                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
midi-gen/
├── package.json              # Monorepo root
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── index.ts          # Express + WebSocket server
│   │   ├── agent.ts          # Claude Agent SDK setup
│   │   ├── tools/
│   │   │   └── midi-tool.ts  # MCP tool for MIDI generation
│   │   ├── music-theory.ts   # (migrated from existing)
│   │   ├── generator.ts      # (migrated from existing)
│   │   └── state.ts          # (migrated from existing)
│   └── tsconfig.json
├── client/
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Controls.tsx      # Key, tempo, style selectors
│   │   │   ├── Player.tsx        # Play/pause, progress bar
│   │   │   ├── Visualizer.tsx    # Piano roll or waveform
│   │   │   ├── Chat.tsx          # Chat with Claude about the music
│   │   │   └── SegmentList.tsx   # List of generated segments
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts   # WebSocket connection
│   │   │   ├── useMidiPlayer.ts  # Tone.js playback
│   │   │   └── useSession.ts     # Session state
│   │   ├── lib/
│   │   │   └── midi.ts           # MIDI parsing/playback utils
│   │   └── styles/
│   │       └── app.css
│   ├── index.html
│   └── vite.config.ts
└── shared/
    └── types.ts              # Shared TypeScript types
```

## Implementation Steps

### Phase 1: Backend Setup

1. **Convert existing JS to TypeScript**
   - Migrate `music-theory.js` → `music-theory.ts`
   - Migrate `generator.js` → `generator.ts`
   - Migrate `state.js` → `state.ts`
   - Add proper type definitions

2. **Create Express + WebSocket server**
   - Express for health checks and static file serving
   - WebSocket for real-time bidirectional communication
   - CORS configuration for local development

3. **Integrate Claude Agent SDK**
   - Install `@anthropic-ai/claude-agent-sdk`
   - Create MCP server with `generate_midi` tool
   - Tool accepts natural language + optional params
   - Returns MIDI data as base64 string

4. **Session management**
   - Track sessions by WebSocket connection
   - Store musical state for continuation
   - Clean up stale sessions

### Phase 2: Frontend Setup

5. **Create React app with Vite**
   - TypeScript configuration
   - Tailwind CSS for styling
   - Development proxy to backend

6. **Build core components**
   - `Controls`: Dropdowns for key, mode, tempo, style, bars
   - `Player`: Play/pause button, progress bar, volume
   - `SegmentList`: Shows generated segments with timestamps

7. **Implement MIDI playback**
   - Use `@tonejs/midi` to parse MIDI data
   - Use `Tone.js` PolySynth for playback
   - Support multiple instrument sounds
   - Handle segment transitions smoothly

8. **WebSocket integration**
   - Connect to backend on app load
   - Handle connection/reconnection
   - Stream generation progress to UI

### Phase 3: Core Features

9. **Generation flow**
   - User sets params or types natural language request
   - Frontend sends to backend via WebSocket
   - Claude Agent processes request, calls MIDI tool
   - MIDI data streams back to frontend
   - Auto-plays generated segment

10. **Extend/Continue feature**
    - "Extend" button sends continuation request
    - Backend reads musical state
    - New segment flows from previous ending
    - Seamless playback of concatenated segments

11. **Chat interface**
    - User can describe what they want in natural language
    - "Make it more upbeat", "Add some tension here"
    - Claude interprets and adjusts generation parameters

### Phase 4: Polish

12. **Visualizer**
    - Piano roll display showing notes
    - Highlight current playback position
    - Show chord progressions

13. **Export functionality**
    - Download individual segments as .mid files
    - Concatenate all segments into single file
    - Export as audio (using Tone.js offline rendering)

14. **Persistence**
    - Save projects to localStorage
    - Resume sessions across page reloads

## Key Technical Decisions

### MIDI Playback: Tone.js + @tonejs/midi
- **Why**: Best balance of features, documentation, and active maintenance
- **How**: Parse MIDI bytes → JSON → Tone.Part with scheduled notes

### Real-time Communication: WebSocket
- **Why**: Bidirectional, supports streaming, maintains connection
- **How**: `ws` library on backend, native WebSocket on frontend

### Claude Integration: Agent SDK with Custom MCP Tool
- **Why**: More powerful than raw API, handles tool use automatically
- **How**: Define `generate_midi` tool that wraps our existing generator

### State Management: Server-side with Musical Context
- **Why**: Continuation requires knowing previous musical state
- **How**: Store last chord, progression position, dynamics per session

## Dependencies

### Backend
- `express` - HTTP server
- `ws` - WebSocket server
- `@anthropic-ai/claude-agent-sdk` - Claude agent
- `midi-writer-js` - MIDI generation (existing)
- `typescript` - Type safety

### Frontend
- `react` - UI framework
- `vite` - Build tool
- `tone` - Audio synthesis
- `@tonejs/midi` - MIDI parsing
- `tailwindcss` - Styling

## Cleanup

After implementation, remove:
- `~/.claude/skills/midi-new.md`
- `~/.claude/skills/midi-extend.md`
- `~/.claude/skills/midi-status.md`
