// 24/7 AI Radio Station Server - Strudel Edition
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@anthropic-ai/claude-agent-sdk';

// Check for Claude OAuth token
if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
  console.warn('⚠️  CLAUDE_CODE_OAUTH_TOKEN not set!');
  console.warn('   Run `claude setup-token` to get your token');
  console.warn('   Then set: export CLAUDE_CODE_OAUTH_TOKEN=<token>');
}
import type {
  ClientMessage,
  ServerMessage,
  RadioState,
  ChatMessage,
  JourneyStep,
  Segment,
  MusicalState,
} from '../../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from client build in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// ============================================
// GLOBAL RADIO STATE
// ============================================

const MAX_PATTERN_HISTORY = 10;
const MAX_CHAT_MESSAGES = 50;
const PATTERN_DURATION_MS = 60000; // Generate new pattern every 60 seconds

// Connected clients with their usernames
const clients = new Map<WebSocket, string>();

// Chat history
const chatMessages: ChatMessage[] = [];

// Radio state
const radioState: RadioState = {
  currentPattern: null,
  patternHistory: [],
  journey: [],
  state: createInitialState(),
  isGenerating: false,
  listeners: 0,
  startedAt: new Date().toISOString(),
};

function createInitialState(): MusicalState {
  return {
    key: 'C',
    mode: 'minor',
    tempo: 90,
    style: 'ambient',
    energy: 'medium',
    totalPatternsPlayed: 0,
    uptimeSeconds: 0,
  };
}

// ============================================
// BROADCASTING
// ============================================

function broadcast(message: ServerMessage) {
  const data = JSON.stringify(message);
  for (const client of clients.keys()) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function broadcastListenerCount() {
  broadcast({ type: 'listeners', count: clients.size });
}

// ============================================
// STRUDEL PATTERN GENERATION
// ============================================

const STRUDEL_EXAMPLES = `
// Ambient pad with arpeggios
note("<c3 eb3 g3 bb3>/2")
  .s("sawtooth")
  .cutoff(800)
  .resonance(10)
  .attack(0.5)
  .decay(0.2)
  .sustain(0.8)
  .release(1)
  .room(0.8)

// Lofi beat with piano
stack(
  note("c4 eb4 g4 bb4").s("piano").velocity(0.6),
  s("bd*2, ~ sd, hh*4").bank("RolandTR808")
).slow(2)

// Jazzy chords
note("<Cm7 Fm7 Bb7 EbM7>/4")
  .voicing()
  .s("piano")
  .velocity(0.5)
  .room(0.5)

// Minimal techno
stack(
  s("bd bd bd bd").bank("RolandTR909"),
  s("~ hh ~ hh").bank("RolandTR909").velocity(0.4),
  note("c2 ~ c2 ~").s("sawtooth").cutoff(400).decay(0.1)
).fast(2)

// Dreamy pads
note("<C3 E3 G3 B3> <D3 F3 A3 C4>")
  .s("sine")
  .attack(2)
  .release(4)
  .room(0.9)
  .delay(0.5)
  .delaytime(0.375)
`;

const patternSchema = {
  type: 'object',
  properties: {
    patternCode: {
      type: 'string',
      description: 'Valid Strudel pattern code. Use stack() for layers, note() for melodies, s() for samples. Must be a single expression.'
    },
    style: { type: 'string' },
    key: { type: 'string' },
    mode: { type: 'string' },
    tempo: { type: 'number', minimum: 60, maximum: 140 },
    energy: { type: 'string', enum: ['low', 'medium', 'high'] },
    reasoning: { type: 'string' },
  },
  required: ['patternCode', 'style', 'key', 'mode', 'tempo', 'energy', 'reasoning'],
};

async function generateNextPattern(): Promise<Segment> {
  const recentChat = chatMessages.slice(-10);
  let chatContext = '';
  if (recentChat.length > 0) {
    chatContext = `\n\nRecent listener chat (incorporate their suggestions!):\n${recentChat.map(m => `- ${m.username}: "${m.message}"`).join('\n')}`;
  }

  const journeyContext = radioState.journey.slice(-5).map(j =>
    `${j.style} in ${j.key} ${j.mode} (${j.direction})`
  ).join(' → ');

  const prompt = `You are an AI DJ for a 24/7 radio station. Generate Strudel (TidalCycles for JavaScript) pattern code.

Current state:
- Style: ${radioState.state.style}
- Key: ${radioState.state.key} ${radioState.state.mode}
- Tempo: ${radioState.state.tempo} BPM
- Energy: ${radioState.state.energy}
- Patterns played: ${radioState.state.totalPatternsPlayed}
- Listeners: ${clients.size}

Journey so far: ${journeyContext || 'Just starting'}
${chatContext}

Example Strudel patterns:
${STRUDEL_EXAMPLES}

Guidelines:
1. Create a complete, valid Strudel pattern as a single expression
2. Use stack() to layer multiple elements (drums, bass, melody, pads)
3. Available synths: sine, sawtooth, square, triangle, piano
4. Available drum banks: RolandTR808, RolandTR909
5. Use .slow(2) or .fast(2) to adjust pattern speed
6. Use .room() for reverb, .delay() for echo
7. Patterns should be musical and evolving
8. Consider listener suggestions from chat!
9. Create smooth transitions from the current style

Generate a pattern that ${
  radioState.state.totalPatternsPlayed === 0
    ? 'starts the journey with an inviting, ambient atmosphere'
    : 'evolves the musical journey based on the current state'
}.`;

  try {
    let result: any = null;
    for await (const message of query({
      prompt,
      options: {
        model: 'claude-sonnet-4-20250514',
        outputFormat: {
          type: 'json_schema',
          schema: patternSchema,
        },
        permissionMode: 'bypassPermissions',
      },
    })) {
      if (message.type === 'result') {
        // Access structured output from the result message
        const resultMsg = message as any;
        if (resultMsg.structured_output) {
          result = resultMsg.structured_output;
        }
      }
    }

    if (!result) {
      throw new Error('No pattern generated');
    }

    return {
      id: uuidv4(),
      patternCode: result.patternCode,
      style: result.style,
      key: result.key,
      mode: result.mode,
      tempo: result.tempo,
      energy: result.energy || 'medium',
      reasoning: result.reasoning,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Radio] Pattern generation error:', error);
    // Fallback pattern
    return {
      id: uuidv4(),
      patternCode: `note("<c3 eb3 g3 bb3>/4").s("sawtooth").cutoff(800).room(0.8)`,
      style: 'ambient',
      key: 'C',
      mode: 'minor',
      tempo: 90,
      energy: 'medium',
      reasoning: 'Fallback ambient pattern',
      generatedAt: new Date().toISOString(),
    };
  }
}

// ============================================
// CONTINUOUS GENERATION LOOP
// ============================================

let generationTimeout: NodeJS.Timeout | null = null;

async function generateAndBroadcast() {
  if (radioState.isGenerating) return;

  radioState.isGenerating = true;
  broadcast({ type: 'ai_status', isGenerating: true, reasoning: 'Creating the next pattern...' });

  try {
    const pattern = await generateNextPattern();

    // Update state
    radioState.currentPattern = pattern;
    radioState.patternHistory.push(pattern);
    if (radioState.patternHistory.length > MAX_PATTERN_HISTORY) {
      radioState.patternHistory.shift();
    }

    radioState.state.style = pattern.style;
    radioState.state.key = pattern.key;
    radioState.state.mode = pattern.mode;
    radioState.state.tempo = pattern.tempo;
    radioState.state.energy = pattern.energy as 'low' | 'medium' | 'high';
    radioState.state.totalPatternsPlayed++;

    // Track journey
    radioState.journey.push({
      style: pattern.style,
      mode: pattern.mode,
      key: pattern.key,
      tempo: pattern.tempo,
      bars: 16,
      direction: 'continue',
      timestamp: new Date().toISOString(),
    });

    // Broadcast new pattern
    broadcast({ type: 'pattern', pattern });
    broadcast({ type: 'ai_status', isGenerating: false, reasoning: pattern.reasoning });

    console.log(`[Radio] New pattern: ${pattern.style} in ${pattern.key} ${pattern.mode} - "${pattern.reasoning}"`);
    console.log(`[Radio] Pattern code: ${pattern.patternCode.slice(0, 100)}...`);

  } catch (error) {
    console.error('[Radio] Generation error:', error);
    broadcast({ type: 'ai_status', isGenerating: false, reasoning: 'Error generating pattern' });
  } finally {
    radioState.isGenerating = false;
  }
}

function startGenerationLoop() {
  console.log('[Radio] Starting pattern generation loop');

  // Generate first pattern immediately
  generateAndBroadcast();

  // Then generate new patterns periodically
  generationTimeout = setInterval(() => {
    if (!radioState.isGenerating) {
      generateAndBroadcast();
    }
  }, PATTERN_DURATION_MS);
}

// Update uptime
setInterval(() => {
  radioState.state.uptimeSeconds = Math.floor(
    (Date.now() - new Date(radioState.startedAt).getTime()) / 1000
  );
}, 1000);

// ============================================
// WEBSOCKET HANDLERS
// ============================================

wss.on('connection', (ws) => {
  console.log('[Radio] Listener connected');

  ws.on('message', async (data) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'join': {
          const username = message.username || `Listener${Math.floor(Math.random() * 1000)}`;
          clients.set(ws, username);

          // Send welcome with current state
          const welcomeMsg: ServerMessage = {
            type: 'welcome',
            radioState: { ...radioState, listeners: clients.size },
            recentChat: chatMessages.slice(-20),
          };
          ws.send(JSON.stringify(welcomeMsg));

          broadcastListenerCount();
          console.log(`[Radio] ${username} joined (${clients.size} listeners)`);

          // Announce in chat
          const joinMsg: ChatMessage = {
            id: uuidv4(),
            username: 'Radio',
            message: `${username} tuned in!`,
            timestamp: new Date().toISOString(),
          };
          chatMessages.push(joinMsg);
          if (chatMessages.length > MAX_CHAT_MESSAGES) chatMessages.shift();
          broadcast({ type: 'chat', message: joinMsg });
          break;
        }

        case 'chat': {
          const username = clients.get(ws) || 'Anonymous';
          const chatMsg: ChatMessage = {
            id: uuidv4(),
            username,
            message: message.message.slice(0, 500),
            timestamp: new Date().toISOString(),
          };
          chatMessages.push(chatMsg);
          if (chatMessages.length > MAX_CHAT_MESSAGES) chatMessages.shift();

          broadcast({ type: 'chat', message: chatMsg });
          console.log(`[Radio] Chat: ${username}: ${message.message}`);
          break;
        }

        case 'sync': {
          ws.send(JSON.stringify({
            type: 'welcome',
            radioState: { ...radioState, listeners: clients.size },
            recentChat: chatMessages.slice(-20),
          }));
          break;
        }
      }
    } catch (error) {
      console.error('[Radio] Message error:', error);
      ws.send(JSON.stringify({ type: 'error', error: (error as Error).message }));
    }
  });

  ws.on('close', () => {
    const username = clients.get(ws);
    clients.delete(ws);
    broadcastListenerCount();
    console.log(`[Radio] ${username || 'Listener'} disconnected (${clients.size} listeners)`);
  });

  ws.on('error', (error) => {
    console.error('[Radio] WebSocket error:', error);
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🎵 AI Radio Station (Strudel Edition) running on http://localhost:${PORT}`);
  console.log(`   WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`   24/7 AI-generated music with Strudel patterns\n`);

  // Start the continuous generation loop
  startGenerationLoop();
});
