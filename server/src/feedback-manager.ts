// Feedback Manager - Aggregates and analyzes listener votes

import type { PatternFeedback } from '../../shared/types.js';

interface VoteRecord {
  upvotes: Set<string>;  // WebSocket IDs who upvoted
  downvotes: Set<string>;  // WebSocket IDs who downvoted
}

const MAX_FEEDBACK_HISTORY = 20;

class FeedbackManager {
  // Map of patternId -> vote record
  private votes: Map<string, VoteRecord> = new Map();

  // History of feedback for recent patterns (for AI prompt context)
  private feedbackHistory: PatternFeedback[] = [];

  /**
   * Record a vote from a listener
   * Returns the updated feedback for the pattern
   */
  recordVote(patternId: string, listenerId: string, value: 1 | -1): PatternFeedback {
    let record = this.votes.get(patternId);

    if (!record) {
      record = { upvotes: new Set(), downvotes: new Set() };
      this.votes.set(patternId, record);
    }

    // Remove any existing vote from this listener
    record.upvotes.delete(listenerId);
    record.downvotes.delete(listenerId);

    // Add new vote
    if (value === 1) {
      record.upvotes.add(listenerId);
    } else {
      record.downvotes.add(listenerId);
    }

    const feedback = this.getFeedback(patternId);
    this.updateHistory(feedback);

    return feedback;
  }

  /**
   * Get feedback for a specific pattern
   */
  getFeedback(patternId: string): PatternFeedback {
    const record = this.votes.get(patternId);

    return {
      patternId,
      upvotes: record?.upvotes.size || 0,
      downvotes: record?.downvotes.size || 0,
    };
  }

  /**
   * Check if a listener has voted on a pattern
   */
  getListenerVote(patternId: string, listenerId: string): 1 | -1 | null {
    const record = this.votes.get(patternId);
    if (!record) return null;

    if (record.upvotes.has(listenerId)) return 1;
    if (record.downvotes.has(listenerId)) return -1;
    return null;
  }

  /**
   * Get recent feedback for AI prompt context
   */
  getRecentFeedback(): PatternFeedback[] {
    return [...this.feedbackHistory];
  }

  /**
   * Get a text summary of recent feedback for the AI prompt
   */
  getFeedbackSummary(): string {
    const recent = this.feedbackHistory.slice(-5);

    if (recent.length === 0) {
      return 'No listener feedback yet.';
    }

    const summary: string[] = [];

    for (const fb of recent) {
      const score = fb.upvotes - fb.downvotes;
      const total = fb.upvotes + fb.downvotes;

      if (total === 0) continue;

      if (score > 0) {
        summary.push(`Pattern ${fb.patternId.slice(0, 8)} was liked (+${fb.upvotes}/-${fb.downvotes})`);
      } else if (score < 0) {
        summary.push(`Pattern ${fb.patternId.slice(0, 8)} was disliked (+${fb.upvotes}/-${fb.downvotes})`);
      } else {
        summary.push(`Pattern ${fb.patternId.slice(0, 8)} had mixed reactions (+${fb.upvotes}/-${fb.downvotes})`);
      }
    }

    if (summary.length === 0) {
      return 'No significant feedback on recent patterns.';
    }

    return `Recent listener feedback:\n${summary.join('\n')}`;
  }

  /**
   * Get overall sentiment (positive, negative, or neutral)
   */
  getOverallSentiment(): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } {
    let totalScore = 0;
    let totalVotes = 0;

    for (const fb of this.feedbackHistory) {
      totalScore += fb.upvotes - fb.downvotes;
      totalVotes += fb.upvotes + fb.downvotes;
    }

    if (totalVotes === 0) {
      return { sentiment: 'neutral', score: 0 };
    }

    const avgScore = totalScore / totalVotes;

    if (avgScore > 0.2) {
      return { sentiment: 'positive', score: avgScore };
    } else if (avgScore < -0.2) {
      return { sentiment: 'negative', score: avgScore };
    }

    return { sentiment: 'neutral', score: avgScore };
  }

  /**
   * Clean up votes when a listener disconnects
   */
  removeListener(listenerId: string): void {
    for (const record of this.votes.values()) {
      record.upvotes.delete(listenerId);
      record.downvotes.delete(listenerId);
    }
  }

  /**
   * Update feedback history
   */
  private updateHistory(feedback: PatternFeedback): void {
    const existingIndex = this.feedbackHistory.findIndex(
      fb => fb.patternId === feedback.patternId
    );

    if (existingIndex >= 0) {
      this.feedbackHistory[existingIndex] = feedback;
    } else {
      this.feedbackHistory.push(feedback);
      if (this.feedbackHistory.length > MAX_FEEDBACK_HISTORY) {
        this.feedbackHistory.shift();
      }
    }
  }

  /**
   * Clean up old pattern votes to prevent memory leaks
   */
  cleanup(activePatternIds: string[]): void {
    const activeSet = new Set(activePatternIds);

    for (const patternId of this.votes.keys()) {
      if (!activeSet.has(patternId)) {
        this.votes.delete(patternId);
      }
    }
  }
}

export const feedbackManager = new FeedbackManager();
export type { FeedbackManager };
