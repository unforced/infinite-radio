import type { Segment } from '../../../shared/types';

interface PlayerProps {
  hasStarted: boolean;
  listenerCount: number;
  isGenerating: boolean;
  aiReasoning: string | null;
  currentPattern: Segment | null;
  onStart: () => void;
  onStop: () => void;
}

export function Player({
  hasStarted,
  listenerCount,
  isGenerating,
  aiReasoning,
  currentPattern,
  onStart,
  onStop,
}: PlayerProps) {
  return (
    <div className="card space-y-4">
      {/* Header with listener count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasStarted && (
            <>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-red-400">LIVE</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span>{listenerCount} listening</span>
        </div>
      </div>

      {/* Big play button for start */}
      <div className="flex justify-center py-4">
        {!hasStarted ? (
          <button
            onClick={onStart}
            disabled={!currentPattern}
            className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 disabled:opacity-50 flex items-center justify-center transition-all shadow-lg shadow-purple-500/25 hover:scale-105"
          >
            <svg className="w-12 h-12 ml-2" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onStop}
            className="w-24 h-24 rounded-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 flex items-center justify-center transition-all shadow-lg shadow-red-500/25 hover:scale-105"
          >
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" />
            </svg>
          </button>
        )}
      </div>

      {!hasStarted && currentPattern && (
        <p className="text-center text-gray-400 text-sm">
          Click to start listening
        </p>
      )}

      {/* AI Status */}
      <div className="flex items-start gap-2 px-3 py-2 bg-gray-800/70 rounded-lg">
        <span className="text-purple-400 font-medium shrink-0">AI DJ:</span>
        {isGenerating ? (
          <span className="text-gray-300 animate-pulse">
            Creating the next pattern...
          </span>
        ) : aiReasoning ? (
          <span className="text-gray-300 text-sm">{aiReasoning}</span>
        ) : currentPattern ? (
          <span className="text-gray-300 text-sm">{currentPattern.reasoning}</span>
        ) : (
          <span className="text-gray-500">Starting up the station...</span>
        )}
      </div>
    </div>
  );
}
