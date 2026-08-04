/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    // lib/ holds the shared typography scale, so its class strings must be
    // scanned too or they get purged from the generated stylesheet.
    './lib/**/*.{js,jsx,ts,tsx}',
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

        // Warm neutral ramp. These values were not invented for this palette —
        // they were already scattered through the verse/Today surfaces as magic
        // hex (GestureCoachOverlay, VerseAudioPlayer, ActionDrawer,
        // SettingsSection, SwipeableCard). Promoting them to tokens is what
        // stops new screens from reaching for Tailwind's cool defaults, which
        // is how the app ended up with two competing neutral families.
        sand: {
          50: '#F8F4EE',  // subtle fill  (was bg-gray-100 / #F1F5F9 / #F7FAFC)
          100: '#F0E8DE', // divider      (was bg-gray-200 / #EDF2F7)
          200: '#E9DFD3', // border       (was #E2E8F0)
          300: '#E8D4BF', // strong border
          400: '#D6C3AE', // inactive icon, warm shadow (was #CBD5E0)
          500: '#B8A894', // muted icon / meta text     (was #A0AEC0)
          600: '#8C7B68',
        },
        // Eyebrow / label brown already used by the verse surfaces.
        clay: '#A56A4C',

        // Reading-state semantics. DO NOT retint these to match the warm ramp.
        // Gold-for-perfect was tested and confused users; the app deliberately
        // moved to a universal traffic-light reading: yellow = started (some of
        // today's 7 read), green = complete (all 7 read).
        status: {
          complete: '#16A34A',
          partial: '#FACC15',
          missed: '#CBD5E1',
          today: '#F97316',
        },
      },
    },
  },
  plugins: [],
};
