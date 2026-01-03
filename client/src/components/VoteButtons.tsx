import type { PatternFeedback } from '../../../shared/types';

interface VoteButtonsProps {
  patternId: string | undefined;
  feedback: PatternFeedback | null;
  userVote: 1 | -1 | null;
  onVote: (value: 1 | -1) => void;
  disabled?: boolean;
}

export function VoteButtons({
  patternId,
  feedback,
  userVote,
  onVote,
  disabled = false,
}: VoteButtonsProps) {
  if (!patternId) return null;

  const upvotes = feedback?.upvotes || 0;
  const downvotes = feedback?.downvotes || 0;
  const score = upvotes - downvotes;

  return (
    <div className="flex items-center gap-3">
      {/* Upvote button */}
      <button
        onClick={() => onVote(1)}
        disabled={disabled}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all duration-200 ${
          userVote === 1
            ? 'bg-green-600/80 text-white shadow-lg shadow-green-600/30'
            : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-green-400'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title="I like this pattern"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2 21h4V9H2v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
        </svg>
        {upvotes > 0 && <span className="text-sm font-medium">{upvotes}</span>}
      </button>

      {/* Score indicator */}
      <span className={`text-sm font-bold min-w-[2rem] text-center ${
        score > 0 ? 'text-green-400' : score < 0 ? 'text-red-400' : 'text-gray-500'
      }`}>
        {score > 0 ? '+' : ''}{score !== 0 ? score : ''}
      </span>

      {/* Downvote button */}
      <button
        onClick={() => onVote(-1)}
        disabled={disabled}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all duration-200 ${
          userVote === -1
            ? 'bg-red-600/80 text-white shadow-lg shadow-red-600/30'
            : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-red-400'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title="I don't like this pattern"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22 3h-4v12h4V3zM0 14c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06l1.06 1.05 6.58-6.59c.37-.36.59-.86.59-1.41V5c0-1.1-.9-2-2-2H5c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2z"/>
        </svg>
        {downvotes > 0 && <span className="text-sm font-medium">{downvotes}</span>}
      </button>
    </div>
  );
}
