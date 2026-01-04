# Infinite Radio - Claude Code Context

## Project Overview
Infinite Radio is a 24/7 AI-generated music streaming station. It uses Claude to generate Strudel (TidalCycles for JavaScript) patterns that play continuously in the browser, with dynamic visuals and listener interaction.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                              │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Strudel     │  │ Visualizer   │  │ React UI          │  │
│  │ (Web Audio) │  │ (Canvas)     │  │ (Player, Chat)    │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
│           ▲              ▲                   ▲              │
│           └──────────────┴───────────────────┘              │
│                          │                                  │
│                    WebSocket                                │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                      Server                                 │
│  ┌─────────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │ Pattern Gen     │  │ Journey     │  │ Feedback       │  │
│  │ (Claude API)    │  │ Manager     │  │ Manager        │  │
│  └─────────────────┘  └─────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

### Server (`server/src/`)
- **index.ts** - Main server, WebSocket handling, pattern generation loop
- **journey-manager.ts** - Time-of-day awareness, energy arcs (intro→build→peak→release)
- **feedback-manager.ts** - Listener upvote/downvote aggregation
- **strudel-library.ts** - Curated Strudel examples and technique guidance

### Client (`client/src/`)
- **App.tsx** - Main app, integrates all components
- **hooks/useStrudelPlayer.ts** - Strudel initialization, pattern playback with validation
- **hooks/useWebSocket.ts** - WebSocket connection, state management
- **hooks/usePatternVisualizer.ts** - Tempo-synced visualizations from pattern metadata
- **hooks/useTheme.ts** - Dynamic theming based on music style
- **components/Player.tsx** - Play/stop controls, AI status display
- **components/VoteButtons.tsx** - Upvote/downvote UI
- **components/Visualizer.tsx** - Canvas-based visualizations (bars, waveform, circles, particles)
- **lib/theme-generator.ts** - Style-to-color mapping (ambient=indigo, techno=cyan, etc.)

### Shared (`shared/`)
- **types.ts** - TypeScript interfaces for Segment, RadioState, WebSocket messages

## Pattern Generation

The server generates patterns using two methods with fallback:

1. **Claude Agent SDK** (primary) - Uses `CLAUDE_CODE_OAUTH_TOKEN`
   - `permissionMode: 'bypassPermissions'` for headless operation
   - Explicit `PATH` in env to fix Docker issues

2. **Direct Anthropic API** (fallback) - Uses `ANTHROPIC_API_KEY`
   - Tool-based structured output

Patterns are validated before broadcast:
- Balanced parentheses/brackets
- No invalid string literals
- Must start with valid Strudel function
- No statements (only expressions)

## Environment Variables

```bash
# For Claude Agent SDK (primary)
CLAUDE_CODE_OAUTH_TOKEN=...

# For direct API fallback
ANTHROPIC_API_KEY=sk-ant-...

# Server config
PORT=3001
NODE_ENV=production
```

## Development

```bash
# Install dependencies
npm install
cd client && npm install
cd ../server && npm install

# Run development servers
npm run dev  # Runs both client (Vite) and server (tsx watch)
```

## Deployment (Railway)

The Dockerfile:
- Uses `node:20-slim` (needs bash for Claude CLI)
- Installs `@anthropic-ai/claude-code` globally
- Runs as non-root user (security requirement)
- Builds client with Vite, server with TypeScript

## Strudel Patterns

Valid patterns are single expressions using Strudel functions:
```javascript
// Good
stack(
  note("c3 eb3 g3").s("sawtooth").cutoff(800),
  s("bd sd").slow(2)
).room(0.5)

// Bad - has statements
let pattern = note("c3"); pattern.play()

// Bad - invalid string literal
"0.4 0.6".slow(2)
```

## WebSocket Messages

Client → Server:
- `join` - Join with username
- `chat` - Send chat message
- `vote` - Upvote/downvote pattern
- `sync` - Request state sync

Server → Client:
- `welcome` - Initial state + recent chat
- `pattern` - New pattern to play
- `chat` - Chat message broadcast
- `ai_status` - Generation status + reasoning
- `listeners` - Listener count update
- `vote_update` - Vote counts updated
