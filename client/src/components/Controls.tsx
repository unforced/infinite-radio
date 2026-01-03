import { useState } from 'react';
import type { GenerationParams, ExtensionDirection } from '../../../shared/types';

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MODES = ['major', 'minor', 'dorian', 'mixolydian', 'pentatonic'];
const STYLES = ['ambient', 'lofi', 'electronic', 'classical', 'jazz'];
const BAR_OPTIONS = [8, 16, 32, 64];

// Mood presets that generate evocative prompts
const MOOD_PRESETS = [
  { label: 'Peaceful', prompt: 'A peaceful, reflective ambient piece with gentle pads and slow movement', icon: '🌅' },
  { label: 'Melancholic', prompt: 'A melancholic lofi track with jazzy chords and wistful melody', icon: '🌧️' },
  { label: 'Energetic', prompt: 'An energetic, uplifting electronic track with driving rhythm', icon: '⚡' },
  { label: 'Mysterious', prompt: 'A mysterious, tense piece in dorian mode with dark atmosphere', icon: '🌙' },
  { label: 'Triumphant', prompt: 'A triumphant, epic classical piece building to a grand climax', icon: '👑' },
  { label: 'Chill', prompt: 'A late night chill lofi beat, laid back and smooth', icon: '🎧' },
  { label: 'Focused', prompt: 'A focused, flowing electronic piece for concentration', icon: '🎯' },
  { label: 'Nostalgic', prompt: 'A nostalgic, warm piece evoking gentle memories', icon: '📷' },
];

// Style-specific prompt suggestions
const STYLE_SUGGESTIONS: Record<string, string[]> = {
  ambient: [
    'Sunrise meditation over misty mountains',
    'Floating weightlessly through clouds',
    'Quiet forest morning with distant birds',
    'Deep space exploration, stars drifting by',
  ],
  lofi: [
    'Rainy window, studying with hot coffee',
    'Cozy coffee shop on a Sunday afternoon',
    'Late night coding session vibes',
    'Walking through autumn leaves',
  ],
  electronic: [
    'Neon city drive at midnight',
    'Dance floor energy building to a drop',
    'Cyberpunk chase through rain-soaked streets',
    'Euphoric festival sunrise moment',
  ],
  classical: [
    'Royal ballroom dance, elegant and refined',
    'Dramatic opera moment, tension building',
    'Pastoral countryside, peaceful and light',
    'Heroic adventure theme, bold and brave',
  ],
  jazz: [
    'Smoky jazz club, saxophone solo',
    'Walking through Manhattan at dusk',
    'Sunday brunch with friends, laid back',
    'Cool bebop improvisation, playful',
  ],
};

// Extension direction options with descriptions
const EXTENSION_DIRECTIONS: Array<{ value: ExtensionDirection; label: string; icon: string; description: string }> = [
  { value: 'continue', label: 'Continue', icon: '→', description: 'Keep the natural flow' },
  { value: 'build', label: 'Build', icon: '📈', description: 'Increase energy' },
  { value: 'peak', label: 'Peak', icon: '🔥', description: 'Stay at high intensity' },
  { value: 'wind_down', label: 'Wind Down', icon: '🌙', description: 'Reduce energy' },
  { value: 'contrast', label: 'Contrast', icon: '🔄', description: 'Change direction' },
];

interface ControlsProps {
  onGenerate: (params: GenerationParams, prompt?: string) => void;
  onExtend: (bars?: number, prompt?: string, direction?: ExtensionDirection, style?: string) => void;
  disabled: boolean;
  hasSession: boolean;
  currentStyle?: string;
  infiniteMode: boolean;
}

export function Controls({ onGenerate, onExtend, disabled, hasSession, currentStyle, infiniteMode }: ControlsProps) {
  const [key, setKey] = useState('C');
  const [mode, setMode] = useState('major');
  const [tempo, setTempo] = useState(90);
  const [style, setStyle] = useState('ambient');
  const [bars, setBars] = useState(16);
  const [prompt, setPrompt] = useState('');
  const [usePrompt, setUsePrompt] = useState(true);
  const [showTips, setShowTips] = useState(false);
  const [extensionDirection, setExtensionDirection] = useState<ExtensionDirection>('continue');
  const [extensionStyle, setExtensionStyle] = useState<string | undefined>(undefined);

  const handleGenerate = () => {
    const params: GenerationParams = { key, mode, tempo, style, bars };
    onGenerate(params, usePrompt && prompt ? prompt : undefined);
  };

  const handleExtend = () => {
    onExtend(bars, usePrompt && prompt ? prompt : undefined, extensionDirection, extensionStyle);
  };

  const handleMoodClick = (moodPrompt: string) => {
    setPrompt(moodPrompt);
    setUsePrompt(true);
  };

  const handleInspireMe = () => {
    // Pick random style and its suggestion
    const styles = Object.keys(STYLE_SUGGESTIONS);
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const suggestions = STYLE_SUGGESTIONS[randomStyle];
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    setPrompt(randomSuggestion);
    setUsePrompt(true);
  };

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-purple-400">Generation Controls</h2>

      {/* Infinite Mode Banner */}
      {infiniteMode && hasSession && (
        <div className="p-3 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-lg border border-purple-500/30">
          <div className="flex items-center gap-2 text-purple-300">
            <span className="text-xl animate-pulse">∞</span>
            <div>
              <div className="font-medium">AI DJ Mode Active</div>
              <div className="text-xs text-gray-400">
                The AI is driving the musical journey. Just sit back and listen!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mood presets */}
      <div className={infiniteMode && hasSession ? 'opacity-50 pointer-events-none' : ''}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Quick moods</span>
          <button
            onClick={handleInspireMe}
            className="text-xs px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded-full text-purple-300 transition-colors"
          >
            Inspire me
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {MOOD_PRESETS.map((mood) => (
            <button
              key={mood.label}
              onClick={() => handleMoodClick(mood.prompt)}
              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-full transition-colors flex items-center gap-1.5"
              title={mood.prompt}
            >
              <span>{mood.icon}</span>
              <span>{mood.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Natural language prompt */}
      <div>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={usePrompt}
            onChange={(e) => setUsePrompt(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-400">Use natural language</span>
        </label>
        {usePrompt && (
          <>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the music you want... e.g., 'A dreamy ambient piece in C minor at 70 BPM'"
              className="input w-full h-20 resize-none"
            />
            {/* Style-specific suggestions */}
            <div className="mt-2">
              <div className="flex gap-2 flex-wrap">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      style === s
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {STYLE_SUGGESTIONS[style]?.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setPrompt(suggestion)}
                    className="text-xs px-2 py-1 bg-gray-800/50 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Manual controls */}
      {!usePrompt && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Key</label>
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="select w-full"
            >
              {KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="select w-full"
            >
              {MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="select w-full"
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Tempo</label>
            <input
              type="number"
              value={tempo}
              onChange={(e) => setTempo(parseInt(e.target.value) || 90)}
              min={40}
              max={200}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Bars</label>
            <select
              value={bars}
              onChange={(e) => setBars(parseInt(e.target.value))}
              className="select w-full"
            >
              {BAR_OPTIONS.map((b) => (
                <option key={b} value={b}>{b} bars</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Extension options (only show when session exists) */}
      {hasSession && (
        <div className="space-y-3 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
          <div className="text-sm font-medium text-purple-400">Extension Options</div>

          {/* Style shift */}
          <div>
            <span className="text-xs text-gray-500 block mb-1.5">Shift mood/style to:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setExtensionStyle(undefined)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  extensionStyle === undefined
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Keep current ({currentStyle || 'ambient'})
              </button>
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setExtensionStyle(s)}
                  className={`px-2 py-1 text-xs rounded transition-colors capitalize ${
                    extensionStyle === s
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Energy direction */}
          <div>
            <span className="text-xs text-gray-500 block mb-1.5">Energy direction:</span>
            <div className="flex flex-wrap gap-1.5">
              {EXTENSION_DIRECTIONS.map((dir) => (
                <button
                  key={dir.value}
                  onClick={() => setExtensionDirection(dir.value)}
                  className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                    extensionDirection === dir.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                  title={dir.description}
                >
                  <span>{dir.icon}</span>
                  <span>{dir.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleGenerate}
          disabled={disabled}
          className="btn btn-primary flex-1"
        >
          {hasSession ? 'New Song' : 'Generate'}
        </button>

        {hasSession && (
          <button
            onClick={handleExtend}
            disabled={disabled}
            className="btn btn-secondary flex-1"
          >
            Extend{extensionStyle ? ` → ${extensionStyle}` : ''} ({extensionDirection.replace('_', ' ')})
          </button>
        )}
      </div>
    </div>
  );
}
