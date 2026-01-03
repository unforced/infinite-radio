// Journey Manager - Time-of-day awareness and energy arc management

export type TimeOfDay =
  | 'early_morning'  // 5-8am
  | 'morning'        // 8-12pm
  | 'afternoon'      // 12-5pm
  | 'evening'        // 5-9pm
  | 'night'          // 9pm-1am
  | 'late_night';    // 1-5am

export type EnergyPhase =
  | 'intro'
  | 'build'
  | 'peak'
  | 'plateau'
  | 'release'
  | 'outro';

export interface TimeConfig {
  period: TimeOfDay;
  defaultEnergy: 'low' | 'medium' | 'high';
  suggestedStyles: string[];
  tempoRange: [number, number];
  moodKeywords: string[];
  description: string;
}

export interface EnergyArc {
  phase: EnergyPhase;
  patternsInPhase: number;
  phaseDuration: number;  // Total patterns in this phase
  targetEnergy: number;   // 0-1 scale
  transitionStyle: 'smooth' | 'sudden' | 'gradual';
}

export interface PatternGuidance {
  suggestedStyle: string;
  suggestedEnergy: 'low' | 'medium' | 'high';
  targetTempo: number;
  arcPhase: EnergyPhase;
  timeOfDay: TimeOfDay;
  guidanceText: string;
}

// ============================================
// TIME OF DAY CONFIGURATIONS
// ============================================

const TIME_CONFIGS: Record<TimeOfDay, TimeConfig> = {
  early_morning: {
    period: 'early_morning',
    defaultEnergy: 'low',
    suggestedStyles: ['ambient', 'drone', 'peaceful', 'meditative'],
    tempoRange: [60, 85],
    moodKeywords: ['gentle', 'awakening', 'soft', 'serene', 'minimal'],
    description: 'Gentle awakening music for early risers',
  },
  morning: {
    period: 'morning',
    defaultEnergy: 'medium',
    suggestedStyles: ['lofi', 'jazz', 'acoustic', 'light electronic'],
    tempoRange: [80, 110],
    moodKeywords: ['uplifting', 'bright', 'warm', 'optimistic', 'coffee'],
    description: 'Energizing yet relaxed morning vibes',
  },
  afternoon: {
    period: 'afternoon',
    defaultEnergy: 'medium',
    suggestedStyles: ['house', 'electronic', 'indie', 'funk'],
    tempoRange: [100, 125],
    moodKeywords: ['focused', 'productive', 'groovy', 'steady'],
    description: 'Productive afternoon energy',
  },
  evening: {
    period: 'evening',
    defaultEnergy: 'medium',
    suggestedStyles: ['downtempo', 'chill', 'soul', 'r&b'],
    tempoRange: [85, 110],
    moodKeywords: ['relaxing', 'unwinding', 'sunset', 'mellow'],
    description: 'Winding down after the day',
  },
  night: {
    period: 'night',
    defaultEnergy: 'high',
    suggestedStyles: ['techno', 'deep house', 'minimal', 'progressive'],
    tempoRange: [118, 130],
    moodKeywords: ['driving', 'hypnotic', 'dark', 'energetic', 'club'],
    description: 'Night time energy and movement',
  },
  late_night: {
    period: 'late_night',
    defaultEnergy: 'low',
    suggestedStyles: ['ambient', 'drone', 'dark ambient', 'experimental'],
    tempoRange: [60, 90],
    moodKeywords: ['dreamy', 'introspective', 'deep', 'mysterious'],
    description: 'Late night contemplation and rest',
  },
};

// ============================================
// ENERGY ARC DEFINITIONS
// ============================================

const ARC_DEFINITIONS: Record<EnergyPhase, { duration: number; targetEnergy: number; transition: 'smooth' | 'sudden' | 'gradual' }> = {
  intro: { duration: 2, targetEnergy: 0.3, transition: 'smooth' },
  build: { duration: 4, targetEnergy: 0.6, transition: 'gradual' },
  peak: { duration: 3, targetEnergy: 0.9, transition: 'sudden' },
  plateau: { duration: 4, targetEnergy: 0.7, transition: 'smooth' },
  release: { duration: 3, targetEnergy: 0.4, transition: 'gradual' },
  outro: { duration: 2, targetEnergy: 0.2, transition: 'smooth' },
};

const ARC_SEQUENCE: EnergyPhase[] = ['intro', 'build', 'peak', 'plateau', 'release', 'outro'];

// ============================================
// JOURNEY MANAGER CLASS
// ============================================

export class JourneyManager {
  private currentArc: EnergyArc;
  private patternsGenerated: number = 0;
  private arcStartPattern: number = 0;
  private timezone: string;

  constructor(timezone: string = 'UTC') {
    this.timezone = timezone;
    this.currentArc = this.createArc('intro');
  }

  private createArc(phase: EnergyPhase): EnergyArc {
    const def = ARC_DEFINITIONS[phase];
    return {
      phase,
      patternsInPhase: 0,
      phaseDuration: def.duration,
      targetEnergy: def.targetEnergy,
      transitionStyle: def.transition,
    };
  }

  /**
   * Get the current time of day based on hour
   */
  getTimeOfDay(date: Date = new Date()): TimeOfDay {
    const hour = date.getHours();

    if (hour >= 5 && hour < 8) return 'early_morning';
    if (hour >= 8 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    if (hour >= 21 || hour < 1) return 'night';
    return 'late_night';
  }

  /**
   * Get the configuration for the current time of day
   */
  getTimeConfig(date: Date = new Date()): TimeConfig {
    return TIME_CONFIGS[this.getTimeOfDay(date)];
  }

  /**
   * Get the current energy arc state
   */
  getEnergyArc(): EnergyArc {
    return { ...this.currentArc };
  }

  /**
   * Advance to the next pattern, potentially changing arc phase
   */
  advancePattern(): void {
    this.patternsGenerated++;
    this.currentArc.patternsInPhase++;

    // Check if we should advance to next phase
    if (this.currentArc.patternsInPhase >= this.currentArc.phaseDuration) {
      const currentIndex = ARC_SEQUENCE.indexOf(this.currentArc.phase);
      const nextIndex = (currentIndex + 1) % ARC_SEQUENCE.length;
      const nextPhase = ARC_SEQUENCE[nextIndex];

      this.currentArc = this.createArc(nextPhase);
      this.arcStartPattern = this.patternsGenerated;

      console.log(`[Journey] Transitioning to ${nextPhase} phase`);
    }
  }

  /**
   * Convert target energy (0-1) to energy level
   */
  private energyToLevel(energy: number): 'low' | 'medium' | 'high' {
    if (energy < 0.35) return 'low';
    if (energy < 0.65) return 'medium';
    return 'high';
  }

  /**
   * Get guidance for the next pattern
   */
  getNextPatternGuidance(listenerCount: number = 0): PatternGuidance {
    const timeConfig = this.getTimeConfig();
    const arc = this.currentArc;

    // Blend time-of-day energy with arc energy
    const timeEnergy = timeConfig.defaultEnergy === 'low' ? 0.3 : timeConfig.defaultEnergy === 'high' ? 0.8 : 0.5;
    const blendedEnergy = (arc.targetEnergy * 0.6) + (timeEnergy * 0.4);

    // Adjust for listener count (more listeners = slightly more energy)
    const listenerBoost = Math.min(listenerCount / 100, 0.2);
    const finalEnergy = Math.min(blendedEnergy + listenerBoost, 1);

    // Pick a style that fits both time and arc
    const suggestedStyle = this.selectStyle(timeConfig, arc);

    // Calculate tempo
    const tempoRange = timeConfig.tempoRange;
    const tempoSpread = tempoRange[1] - tempoRange[0];
    const targetTempo = Math.round(tempoRange[0] + (tempoSpread * finalEnergy));

    // Build guidance text
    const guidanceText = this.buildGuidanceText(timeConfig, arc, finalEnergy);

    return {
      suggestedStyle,
      suggestedEnergy: this.energyToLevel(finalEnergy),
      targetTempo,
      arcPhase: arc.phase,
      timeOfDay: timeConfig.period,
      guidanceText,
    };
  }

  private selectStyle(timeConfig: TimeConfig, arc: EnergyArc): string {
    const styles = timeConfig.suggestedStyles;

    // During peak, prefer more energetic styles (later in list tends to be more energetic)
    if (arc.phase === 'peak' && styles.length > 1) {
      return styles[styles.length - 1];
    }

    // During intro/outro, prefer calmer styles (earlier in list)
    if (arc.phase === 'intro' || arc.phase === 'outro') {
      return styles[0];
    }

    // Otherwise, pick based on position in arc
    const progress = arc.patternsInPhase / arc.phaseDuration;
    const index = Math.floor(progress * (styles.length - 1));
    return styles[Math.min(index, styles.length - 1)];
  }

  private buildGuidanceText(timeConfig: TimeConfig, arc: EnergyArc, energy: number): string {
    const phaseDescriptions: Record<EnergyPhase, string> = {
      intro: 'Start gently, establishing the mood with simple, inviting elements.',
      build: 'Gradually add layers and complexity, building anticipation.',
      peak: 'Maximum energy and intensity! Full arrangement, driving rhythms.',
      plateau: 'Maintain the energy with subtle variations, keep it interesting.',
      release: 'Begin to wind down, remove elements, soften the sound.',
      outro: 'Minimal and peaceful, preparing for the next journey.',
    };

    const energyAdvice = energy > 0.7
      ? 'High energy: Use driving rhythms, full layers, intense modulation.'
      : energy > 0.4
      ? 'Medium energy: Balanced groove, steady pulse, moderate complexity.'
      : 'Low energy: Sparse, ambient, long releases, gentle movements.';

    return `
TIME: ${timeConfig.description}
PHASE: ${arc.phase.toUpperCase()} (${arc.patternsInPhase + 1}/${arc.phaseDuration})
${phaseDescriptions[arc.phase]}

${energyAdvice}

MOOD: ${timeConfig.moodKeywords.slice(0, 3).join(', ')}
SUGGESTED STYLE: ${timeConfig.suggestedStyles[0]}
`.trim();
  }

  /**
   * Get a summary of the current journey state
   */
  getJourneySummary(): string {
    const timeConfig = this.getTimeConfig();
    const arc = this.currentArc;

    return `Journey: ${timeConfig.period} | Arc: ${arc.phase} (${arc.patternsInPhase + 1}/${arc.phaseDuration}) | Patterns: ${this.patternsGenerated}`;
  }

  /**
   * Reset the journey (e.g., on server restart)
   */
  reset(): void {
    this.patternsGenerated = 0;
    this.arcStartPattern = 0;
    this.currentArc = this.createArc('intro');
    console.log('[Journey] Reset to intro phase');
  }
}

// Singleton instance
export const journeyManager = new JourneyManager();
