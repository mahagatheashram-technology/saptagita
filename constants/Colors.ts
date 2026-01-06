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

export default Colors;
