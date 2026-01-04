# Infinite Radio

A 24/7 AI-generated music streaming station powered by Claude and [Strudel](https://strudel.cc/).

## What is this?

Infinite Radio continuously generates unique electronic music patterns using AI. The music plays directly in your browser with dynamic visualizations that sync to the beat. Listeners can chat and vote on patterns, influencing future generations.

### Features

- **AI-Generated Music** - Claude generates Strudel patterns every 60 seconds
- **Musical Journey** - Time-of-day awareness creates appropriate moods (chill mornings, energetic afternoons)
- **Energy Arcs** - Patterns follow intro→build→peak→release cycles
- **Dynamic Theming** - UI colors shift based on music style (ambient=purple, techno=cyan, house=orange)
- **Beat-Synced Visuals** - Canvas visualizations pulse with tempo and energy
- **Listener Interaction** - Chat and upvote/downvote patterns
- **Pattern Validation** - Invalid patterns are caught and replaced with fallbacks

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, WebSocket
- **AI**: Claude API (Agent SDK + direct API fallback)
- **Music**: [Strudel](https://strudel.cc/) (TidalCycles for JavaScript)
- **Deployment**: Railway, Docker

## Quick Start

### Prerequisites

- Node.js 18+
- Claude API key or OAuth token

### Development

```bash
# Clone the repo
git clone https://github.com/unforced/infinite-radio.git
cd infinite-radio

# Install dependencies
npm install
cd client && npm install
cd ../server && npm install
cd ..

# Set up environment
cp .env.example .env
# Edit .env with your API key

# Run development servers
npm run dev
```

Open http://localhost:5173 to listen.

### Environment Variables

```bash
# Primary: Claude Agent SDK authentication
CLAUDE_CODE_OAUTH_TOKEN=your-oauth-token

# Fallback: Direct Anthropic API
ANTHROPIC_API_KEY=sk-ant-...

# Server configuration
PORT=3001
NODE_ENV=development
```

## Deployment

### Railway (Recommended)

1. Connect your GitHub repo to Railway
2. Set environment variables:
   - `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`
   - `NODE_ENV=production`
3. Deploy - Railway will use the Dockerfile automatically

### Docker

```bash
docker build -t infinite-radio .
docker run -p 3001:3001 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  infinite-radio
```

## How It Works

### Pattern Generation

Every 60 seconds, the server:
1. Gets journey guidance (time-of-day, energy arc phase)
2. Collects recent chat messages and listener feedback
3. Prompts Claude to generate a Strudel pattern
4. Validates the pattern syntax
5. Broadcasts to all connected clients

### Strudel Patterns

Patterns are single JavaScript expressions using Strudel's live coding DSL:

```javascript
stack(
  note("c3 eb3 g3 bb3")
    .s("sawtooth")
    .cutoff(sine.range(400, 2000).slow(8))
    .room(0.6),
  s("bd sd:2 bd bd sd:3")
    .slow(2)
    .gain(0.8)
).every(4, x => x.fast(2))
```

### Journey System

The AI DJ considers:
- **Time of Day**: Early morning is ambient, afternoon is energetic
- **Energy Arc**: Patterns build tension and release over ~20-minute cycles
- **Listener Feedback**: Upvoted styles are favored, downvoted ones avoided
- **Chat Suggestions**: Listeners can request styles in chat

## Project Structure

```
infinite-radio/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Theme generation
│   │   └── styles/         # CSS with theme variables
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── index.ts        # Main server & pattern generation
│   │   ├── journey-manager.ts
│   │   ├── feedback-manager.ts
│   │   └── strudel-library.ts
│   └── package.json
├── shared/                 # Shared TypeScript types
│   └── types.ts
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Contributing

Contributions welcome! Some ideas:
- New visualization modes
- Additional music styles in the Strudel library
- Mobile-optimized UI
- Audio recording/export

## License

AGPL-3.0-or-later

This project uses [Strudel](https://strudel.cc/) which is licensed under AGPL-3.0. To comply with the AGPL's copyleft requirements, this project is also licensed under AGPL-3.0. See [LICENSE](LICENSE) for details.

## Credits

- [Strudel](https://strudel.cc/) - The amazing live coding music framework
- [Claude](https://anthropic.com) - AI pattern generation
- [TidalCycles](https://tidalcycles.org/) - Inspiration for Strudel
