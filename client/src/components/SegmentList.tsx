import type { Segment } from '../../../shared/types';

interface SegmentListProps {
  segments: Segment[];
  onPlaySegment?: (segment: Segment) => void;
  onDownloadSegment?: (segment: Segment) => void;
}

export function SegmentList({ segments }: SegmentListProps) {
  if (segments.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Pattern History</h3>
        <p className="text-gray-500 text-sm">No patterns yet...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-4">
      <h3 className="text-lg font-semibold text-white mb-3">
        Pattern History ({segments.length})
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {segments.slice().reverse().map((segment) => (
          <div
            key={segment.id}
            className="bg-gray-700/50 rounded-lg p-3 text-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-purple-400 font-medium">
                {segment.style}
              </span>
              <span className="text-gray-500 text-xs">
                {segment.key} {segment.mode}
              </span>
            </div>
            <p className="text-gray-400 text-xs line-clamp-2">
              {segment.reasoning}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
