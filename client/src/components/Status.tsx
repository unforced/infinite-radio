import type { Session } from '../../../shared/types';

interface StatusProps {
  connected: boolean;
  session: Session | null;
  generating: boolean;
  statusMessage: string;
  error: string | null;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function Status({ connected, session, generating, statusMessage, error }: StatusProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-purple-400">Status</h2>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-sm text-gray-400">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {generating && (
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-purple-300 text-sm">{statusMessage}</p>
          </div>
        </div>
      )}

      {session && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Key</span>
            <p className="font-medium">{session.state.key} {session.state.mode}</p>
          </div>
          <div>
            <span className="text-gray-500">Tempo</span>
            <p className="font-medium">{session.state.tempo} BPM</p>
          </div>
          <div>
            <span className="text-gray-500">Style</span>
            <p className="font-medium capitalize">{session.state.style}</p>
          </div>
          <div>
            <span className="text-gray-500">Duration</span>
            <p className="font-medium">{formatDuration(session.state.totalDurationSeconds)}</p>
          </div>
          {session.state.currentChord && (
            <div>
              <span className="text-gray-500">Current Chord</span>
              <p className="font-medium">{session.state.currentChord} {session.state.currentChordType}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">Dynamics</span>
            <p className="font-medium capitalize">{session.state.dynamics.level} ({session.state.dynamics.direction})</p>
          </div>
        </div>
      )}

      {!session && !generating && (
        <p className="text-gray-500 text-sm text-center py-4">
          No active session. Generate some music to get started!
        </p>
      )}
    </div>
  );
}
