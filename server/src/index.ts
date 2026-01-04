// 24/7 AI Radio Station Server - Strudel Edition
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@anthropic-ai/claude-agent-sdk';
import Anthropic from '@anthropic-ai/sdk';
import { buildEnhancedPrompt, STYLE_EXAMPLES, STRUDEL_TECHNIQUES } from './strudel-library.js';
import { journeyManager, type PatternGuidance } from './journey-manager.js';
import { feedbackManager } from './feedback-manager.js';

// Initialize Anthropic client (fallback for when Agent SDK fails)
const anthropic = new Anthropic();

// Check for authentication - Agent SDK prefers OAuth token, fallback API uses API key
const hasOAuthToken = !!process.env.CLAUDE_CODE_OAUTH_TOKEN;
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

if (!hasOAuthToken && !hasApiKey) {
  console.warn('⚠️  No authentication configured!');
  console.warn('   For Claude Agent SDK: export CLAUDE_CODE_OAUTH_TOKEN=<token>');
  console.warn('   For direct API fallback: export ANTHROPIC_API_KEY=<key>');
} else {
  if (hasOAuthToken) {
    console.log('✓ CLAUDE_CODE_OAUTH_TOKEN set - Agent SDK enabled');
  }
  if (hasApiKey) {
    console.log('✓ ANTHROPIC_API_KEY set - Direct API fallback enabled');
  }
}

// Flag to track if Agent SDK should be used
let useAgentSDK = hasOAuthToken;
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
// In dev: server/src -> ../../client/dist
// In prod (built with rootDir=".."): server/dist/server/src -> ../../../../client/dist
const clientDist = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '../../../../client/dist')
  : path.join(__dirname, '../../client/dist');
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

// Build comprehensive examples from the library
const STRUDEL_EXAMPLES = `
=== LAYERING EXAMPLE ===
${STRUDEL_TECHNIQUES.layering}

=== MODULATION EXAMPLE ===
${STRUDEL_TECHNIQUES.modulation}

=== EVOLUTION EXAMPLE ===
${STRUDEL_TECHNIQUES.evolution}

=== STYLE EXAMPLES ===

// Ambient:
${STYLE_EXAMPLES.ambient}

// Lofi:
${STYLE_EXAMPLES.lofi}

// Techno:
${STYLE_EXAMPLES.techno}

// House:
${STYLE_EXAMPLES.house}
`;

// Tool definition for structured pattern generation
const patternTool: Anthropic.Tool = {
  name: 'generate_pattern',
  description: 'Generate a Strudel music pattern for the radio station',
  input_schema: {
    type: 'object' as const,
    properties: {
      patternCode: {
        type: 'string',
        description: 'Valid Strudel pattern code. Use stack() for layers, note() for melodies, s() for samples. Must be a single expression that can be evaluated.'
      },
      style: {
        type: 'string',
        description: 'The musical style (e.g., ambient, lofi, techno, jazz, house)'
      },
      key: {
        type: 'string',
        description: 'Musical key (e.g., C, D, F#, Bb)'
      },
      mode: {
        type: 'string',
        description: 'Scale mode (e.g., major, minor, dorian, mixolydian)'
      },
      tempo: {
        type: 'number',
        description: 'Tempo in BPM (60-140)'
      },
      energy: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Energy level of the pattern'
      },
      reasoning: {
        type: 'string',
        description: 'Brief explanation of why this pattern fits the current moment'
      },
    },
    required: ['patternCode', 'style', 'key', 'mode', 'tempo', 'energy', 'reasoning'],
  },
};

// Build the prompt for pattern generation
function buildPatternPrompt(): string {
  const guidance = journeyManager.getNextPatternGuidance(clients.size);

  const recentChat = chatMessages.slice(-10);
  let chatContext = '';
  if (recentChat.length > 0) {
    chatContext = `\n\nRecent listener chat (incorporate their suggestions!):\n${recentChat.map(m => `- ${m.username}: "${m.message}"`).join('\n')}`;
  }

  const journeyContext = radioState.journey.slice(-5).map(j =>
    `${j.style} in ${j.key} ${j.mode} (${j.direction})`
  ).join(' → ');

  const feedbackContext = feedbackManager.getFeedbackSummary();
  const sentiment = feedbackManager.getOverallSentiment();

  return `You are an AI DJ for a 24/7 radio station. Generate Strudel (TidalCycles for JavaScript) pattern code.

=== JOURNEY GUIDANCE ===
${guidance.guidanceText}

Suggested style: ${guidance.suggestedStyle}
Suggested energy: ${guidance.suggestedEnergy}
Target tempo: ~${guidance.targetTempo} BPM

=== CURRENT STATE ===
- Previous style: ${radioState.state.style}
- Key: ${radioState.state.key} ${radioState.state.mode}
- Previous tempo: ${radioState.state.tempo} BPM
- Patterns played: ${radioState.state.totalPatternsPlayed}
- Listeners: ${clients.size}

Journey so far: ${journeyContext || 'Just starting'}

=== LISTENER FEEDBACK ===
${feedbackContext}
Overall mood: ${sentiment.sentiment} (score: ${sentiment.score.toFixed(2)})
${sentiment.sentiment === 'negative' ? 'Consider adjusting the style or energy based on listener preferences.' : ''}
${chatContext}

Example Strudel patterns:
${STRUDEL_EXAMPLES}

=== ADVANCED TECHNIQUES ===

LAYERING with stack():
- Combine drums, bass, chords, and melody in one pattern
- Each layer can have independent timing (.slow(), .fast())
- Use velocity to balance layers

MODULATION with signals:
- sine.range(min, max).slow(n) - smooth oscillation
- saw.range(min, max) - ramp up then reset
- tri.range(min, max) - triangle wave
- perlin.range(min, max) - organic noise
- Apply to .cutoff(), .pan(), .room(), .delay()

EVOLUTION with conditional modifiers:
- .every(n, fn) - apply transformation every n cycles
- .sometimes(fn) - 50% chance to apply
- .rarely(fn) - 10% chance
- .often(fn) - 75% chance
- Example: .every(4, x => x.fast(2)).sometimes(x => x.rev())

EFFECTS:
- Filters: .lpf(freq), .hpf(freq), .bpf(freq)
- Envelopes: .attack(s), .decay(s), .sustain(0-1), .release(s)
- Space: .room(0-1), .size(0-1), .delay(wet), .delaytime(s), .delayfeedback(0-1)
- Dynamics: .velocity(0-1), .pan(0-1)

IMPORTANT:
- Output must be a SINGLE expression (no let, const, or semicolons)
- End result should be the pattern itself, NOT wrapped in .play()
- Use stack() to combine multiple voices
- Make it MUSICAL - think about rhythm, harmony, and texture

Generate a pattern that ${
  radioState.state.totalPatternsPlayed === 0
    ? 'starts the journey with an inviting, ambient atmosphere'
    : `evolves naturally from the current ${radioState.state.style} vibe with ${radioState.state.energy} energy`
}.

RESPOND WITH EXACTLY THIS JSON FORMAT (no other text):
{
  "patternCode": "your strudel pattern code here",
  "style": "ambient/lofi/techno/house/jazz/etc",
  "key": "C/D/E/F/G/A/B with optional # or b",
  "mode": "major/minor/dorian/etc",
  "tempo": 90,
  "energy": "low/medium/high",
  "reasoning": "Brief explanation of your choices"
}`;
}

// Generate pattern using Claude Agent SDK
async function generateWithAgentSDK(): Promise<Segment | null> {
  const prompt = buildPatternPrompt();

  console.log('[Radio] Using Claude Agent SDK for pattern generation...');

  try {
    let resultText = '';

    for await (const message of query({
      prompt,
      options: {
        model: 'claude-sonnet-4-5-20250929',
        maxTurns: 3,
        permissionMode: 'bypassPermissions',
        cwd: process.cwd(),
        // Pass PATH explicitly to fix Docker "spawn node ENOENT" error
        // Pass OAuth token for authentication
        env: {
          PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
          CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN || '',
          // Also pass API key as fallback auth method
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
        },
      },
    })) {
      if ('result' in message) {
        resultText = message.result;
      }
    }

    if (!resultText) {
      throw new Error('No result from Agent SDK');
    }

    // Parse JSON from the response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]) as {
      patternCode: string;
      style: string;
      key: string;
      mode: string;
      tempo: number;
      energy: string;
      reasoning: string;
    };

    console.log('[Radio] Agent SDK generated pattern successfully');

    return {
      id: uuidv4(),
      patternCode: result.patternCode,
      style: result.style,
      key: result.key,
      mode: result.mode,
      tempo: result.tempo,
      energy: (result.energy || 'medium') as 'low' | 'medium' | 'high',
      reasoning: result.reasoning,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Radio] Agent SDK error:', error);
    return null;
  }
}

// Generate pattern using direct Anthropic API (fallback)
async function generateWithDirectAPI(): Promise<Segment | null> {
  const prompt = buildPatternPrompt();

  console.log('[Radio] Using direct Anthropic API for pattern generation...');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      tools: [patternTool],
      tool_choice: { type: 'tool', name: 'generate_pattern' },
      messages: [{ role: 'user', content: prompt }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUse || toolUse.name !== 'generate_pattern') {
      throw new Error('No pattern generated');
    }

    const result = toolUse.input as {
      patternCode: string;
      style: string;
      key: string;
      mode: string;
      tempo: number;
      energy: string;
      reasoning: string;
    };

    console.log('[Radio] Direct API generated pattern successfully');

    return {
      id: uuidv4(),
      patternCode: result.patternCode,
      style: result.style,
      key: result.key,
      mode: result.mode,
      tempo: result.tempo,
      energy: (result.energy || 'medium') as 'low' | 'medium' | 'high',
      reasoning: result.reasoning,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Radio] Direct API error:', error);
    return null;
  }
}

async function generateNextPattern(): Promise<Segment> {
  // Try Agent SDK first if enabled
  if (useAgentSDK) {
    const result = await generateWithAgentSDK();
    if (result) {
      return result;
    }
    console.log('[Radio] Agent SDK failed, falling back to direct API');
  }

  // Fall back to direct API
  const result = await generateWithDirectAPI();
  if (result) {
    return result;
  }

  // Ultimate fallback pattern
  console.log('[Radio] All generation methods failed, using fallback pattern');
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

    // Advance the journey arc
    journeyManager.advancePattern();

    // Broadcast new pattern
    broadcast({ type: 'pattern', pattern });
    broadcast({ type: 'ai_status', isGenerating: false, reasoning: pattern.reasoning });

    console.log(`[Radio] ${journeyManager.getJourneySummary()}`);
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

        case 'vote': {
          if (radioState.currentPattern && message.patternId === radioState.currentPattern.id) {
            const listenerId = clients.get(ws) || 'anonymous';
            const feedback = feedbackManager.recordVote(
              message.patternId,
              listenerId,
              message.value
            );
            broadcast({ type: 'vote_update', feedback });
            console.log(`[Radio] ${listenerId} voted ${message.value > 0 ? '👍' : '👎'} on current pattern`);
          }
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
    if (username) {
      feedbackManager.removeListener(username);
    }
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
