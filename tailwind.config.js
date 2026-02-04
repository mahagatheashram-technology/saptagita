/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B35',
        secondary: '#1A365D',
        background: '#FFFBF5',
        surface: '#FFFFFF',
        textPrimary: '#2D3748',
        textSecondary: '#718096',
        success: '#38A169',
        accent: '#D69E2E',
      },
    },
  },
  plugins: [],
};


