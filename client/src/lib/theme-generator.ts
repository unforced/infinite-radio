// Theme generator - Maps musical mood/energy to visual themes

export interface Theme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundAlt: string;
  gradientStart: string;
  gradientEnd: string;
  text: string;
  textMuted: string;
  glow: string;
}

// ============================================
// MOOD-BASED PALETTES
// ============================================

const MOOD_PALETTES: Record<string, Theme> = {
  ambient: {
    name: 'Ambient',
    primary: '#6366f1',     // Indigo
    secondary: '#818cf8',
    accent: '#a5b4fc',
    background: '#0f0f1a',
    backgroundAlt: '#1a1a2e',
    gradientStart: '#1e1b4b',
    gradientEnd: '#0f0f1a',
    text: '#e2e8f0',
    textMuted: '#94a3b8',
    glow: 'rgba(99, 102, 241, 0.4)',
  },
  lofi: {
    name: 'Lofi',
    primary: '#f472b6',     // Pink
    secondary: '#fb7185',
    accent: '#fda4af',
    background: '#18181b',
    backgroundAlt: '#27272a',
    gradientStart: '#3f3f46',
    gradientEnd: '#18181b',
    text: '#fafafa',
    textMuted: '#a1a1aa',
    glow: 'rgba(244, 114, 182, 0.4)',
  },
  techno: {
    name: 'Techno',
    primary: '#22d3ee',     // Cyan
    secondary: '#06b6d4',
    accent: '#67e8f9',
    background: '#0a0a0a',
    backgroundAlt: '#171717',
    gradientStart: '#0e4667',
    gradientEnd: '#0a0a0a',
    text: '#f5f5f5',
    textMuted: '#737373',
    glow: 'rgba(34, 211, 238, 0.5)',
  },
  house: {
    name: 'House',
    primary: '#f97316',     // Orange
    secondary: '#fb923c',
    accent: '#fdba74',
    background: '#1c1917',
    backgroundAlt: '#292524',
    gradientStart: '#7c2d12',
    gradientEnd: '#1c1917',
    text: '#fafaf9',
    textMuted: '#a8a29e',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  jazz: {
    name: 'Jazz',
    primary: '#eab308',     // Yellow/Gold
    secondary: '#fbbf24',
    accent: '#fcd34d',
    background: '#1a1a2e',
    backgroundAlt: '#2d2d44',
    gradientStart: '#422006',
    gradientEnd: '#1a1a2e',
    text: '#fef3c7',
    textMuted: '#d97706',
    glow: 'rgba(234, 179, 8, 0.4)',
  },
  downtempo: {
    name: 'Downtempo',
    primary: '#14b8a6',     // Teal
    secondary: '#2dd4bf',
    accent: '#5eead4',
    background: '#0d1117',
    backgroundAlt: '#161b22',
    gradientStart: '#134e4a',
    gradientEnd: '#0d1117',
    text: '#e6fffa',
    textMuted: '#5eead4',
    glow: 'rgba(20, 184, 166, 0.4)',
  },
  drone: {
    name: 'Drone',
    primary: '#8b5cf6',     // Purple
    secondary: '#a78bfa',
    accent: '#c4b5fd',
    background: '#09090b',
    backgroundAlt: '#18181b',
    gradientStart: '#2e1065',
    gradientEnd: '#09090b',
    text: '#ede9fe',
    textMuted: '#a78bfa',
    glow: 'rgba(139, 92, 246, 0.5)',
  },
  electronic: {
    name: 'Electronic',
    primary: '#ec4899',     // Pink
    secondary: '#f472b6',
    accent: '#f9a8d4',
    background: '#0c0c0c',
    backgroundAlt: '#1a1a1a',
    gradientStart: '#4c0519',
    gradientEnd: '#0c0c0c',
    text: '#fdf2f8',
    textMuted: '#f9a8d4',
    glow: 'rgba(236, 72, 153, 0.5)',
  },
};

// Default theme for unknown styles
const DEFAULT_THEME: Theme = MOOD_PALETTES.ambient;

// ============================================
// ENERGY-BASED ADJUSTMENTS
// ============================================

function adjustForEnergy(theme: Theme, energy: 'low' | 'medium' | 'high'): Theme {
  // Create a copy to avoid mutating original
  const adjusted = { ...theme };

  switch (energy) {
    case 'low':
      // Desaturate and darken for calm vibes
      adjusted.gradientStart = darken(theme.gradientStart, 0.2);
      adjusted.glow = adjustOpacity(theme.glow, 0.2);
      break;
    case 'high':
      // Brighten and intensify for energy
      adjusted.glow = adjustOpacity(theme.glow, 0.6);
      break;
    default:
      // Medium is the default
      break;
  }

  return adjusted;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function darken(hex: string, amount: number): string {
  // Simple darkening - reduce RGB values
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.max(0, Math.floor(rgb.r * (1 - amount)));
  const g = Math.max(0, Math.floor(rgb.g * (1 - amount)));
  const b = Math.max(0, Math.floor(rgb.b * (1 - amount)));

  return rgbToHex(r, g, b);
}

function adjustOpacity(rgba: string, newOpacity: number): string {
  // Adjust the opacity in an rgba string
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (!match) return rgba;

  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${newOpacity})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// ============================================
// MAIN EXPORT FUNCTIONS
// ============================================

/**
 * Get a theme based on style and energy
 */
export function getThemeForPattern(
  style: string,
  energy: 'low' | 'medium' | 'high' = 'medium'
): Theme {
  const normalizedStyle = style.toLowerCase();

  // Find matching palette
  let baseTheme = DEFAULT_THEME;
  for (const [key, theme] of Object.entries(MOOD_PALETTES)) {
    if (normalizedStyle.includes(key)) {
      baseTheme = theme;
      break;
    }
  }

  // Check for additional style keywords
  if (normalizedStyle.includes('chill') || normalizedStyle.includes('peaceful')) {
    baseTheme = MOOD_PALETTES.ambient;
  } else if (normalizedStyle.includes('club') || normalizedStyle.includes('dance')) {
    baseTheme = MOOD_PALETTES.house;
  } else if (normalizedStyle.includes('dark') || normalizedStyle.includes('deep')) {
    baseTheme = MOOD_PALETTES.drone;
  }

  return adjustForEnergy(baseTheme, energy);
}

/**
 * Apply theme to CSS custom properties
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-secondary', theme.secondary);
  root.style.setProperty('--theme-accent', theme.accent);
  root.style.setProperty('--theme-background', theme.background);
  root.style.setProperty('--theme-background-alt', theme.backgroundAlt);
  root.style.setProperty('--theme-gradient-start', theme.gradientStart);
  root.style.setProperty('--theme-gradient-end', theme.gradientEnd);
  root.style.setProperty('--theme-text', theme.text);
  root.style.setProperty('--theme-text-muted', theme.textMuted);
  root.style.setProperty('--theme-glow', theme.glow);
}

/**
 * Get all available themes (for previewing)
 */
export function getAllThemes(): Theme[] {
  return Object.values(MOOD_PALETTES);
}

export { DEFAULT_THEME, MOOD_PALETTES };
