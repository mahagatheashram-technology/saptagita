export const Colors = {
  light: {
    text: '#2D3748',
    background: '#FFFBF5',
    tint: '#FF6B35',
    tabIconDefault: '#718096',
    tabIconSelected: '#FF6B35',
  },
  dark: {
    text: '#f0f0f0',
    background: '#111827',
    tint: '#FF6B35',
    tabIconDefault: '#a0aec0',
    tabIconSelected: '#FF6B35',
  },
} as const;

// Legacy palette export used across the app (non-themed)
export const colors = {
  primary: '#FF6B35',
  secondary: '#1A365D',
  background: '#FFFBF5',
  surface: '#FFFFFF',
  textPrimary: '#2D3748',
  textSecondary: '#718096',
  success: '#38A169',
  accent: '#D69E2E',
} as const;

// Warm neutral ramp — mirrors `sand` in tailwind.config.js. Use these for the
// props that can't take a className (Ionicons `color`, Switch `thumbColor`,
// shadowColor, and inline styles).
export const sand = {
  50: '#F8F4EE',
  100: '#F0E8DE',
  200: '#E9DFD3',
  300: '#E8D4BF',
  400: '#D6C3AE',
  500: '#B8A894',
  600: '#8C7B68',
} as const;

export const clay = '#A56A4C';

// Reading-state semantics — see the note in tailwind.config.js before changing.
// yellow = started, green = all 7 read. Deliberately NOT part of the warm ramp.
export const status = {
  complete: '#16A34A',
  partial: '#FACC15',
  missed: '#CBD5E1',
  today: '#F97316',
} as const;

export default Colors;
