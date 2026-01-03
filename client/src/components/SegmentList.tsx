import type { Segment } from '../../../shared/types';

interface SegmentListProps {
  segments: Segment[];
  onPlaySegment: (segment: Segment) => void;
  onDownloadSegment: (segment: Segment) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SegmentList({ segments, onPlaySegment, onDownloadSegment }: SegmentListProps) {
  if (segments.length === 0) {
    return (
      <div className="card text-center text-gray-500 py-8">
        <p>No segments generated yet</p>
        <p className="text-sm mt-2">Generate some music to get started!</p>
      </div>
    );
  }

  const totalDuration = segments.reduce((sum, s) => sum + s.durationSeconds, 0);
  const totalBars = segments.reduce((sum, s) => sum + s.bars, 0);

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-purple-400">Segments</h2>
        <div className="text-sm text-gray-400">
          {segments.length} segment{segments.length !== 1 ? 's' : ''} · {totalBars} bars · {formatDuration(totalDuration)}
        </div>
      </div>

      <div className="space-y-2">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className="flex items-center justify-between p-3 bg-gray-900 rounded-lg hover:bg-gray-850 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-purple-400 font-mono text-sm w-8">
                #{index + 1}
              </span>
              <div>
                <div className="font-medium">{segment.filename}</div>
                <div className="text-sm text-gray-500">
                  {segment.bars} bars · {formatDuration(segment.durationSeconds)}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onPlaySegment(segment)}
                className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                title="Play segment"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </button>

              <button
                onClick={() => onDownloadSegment(segment)}
                className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                title="Download MIDI"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
