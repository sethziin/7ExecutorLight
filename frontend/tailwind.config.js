/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        zinc: {
          '50':  'var(--zinc-50)',
          '100': 'var(--zinc-100)',
          '200': 'var(--zinc-200)',
          '300': 'var(--zinc-300)',
          '400': 'var(--zinc-400)',
          '500': 'var(--zinc-500)',
          '600': 'var(--zinc-600)',
          '700': 'var(--zinc-700)',
          '800': 'var(--zinc-800)',
          '900': 'var(--zinc-900)',
        },
        app: {
          bg: 'var(--app-bg)',
          surface: 'var(--app-surface)',
          panel: 'var(--app-panel)',
          card: 'var(--app-card)',
          border: 'var(--app-border)',
          hover: 'var(--app-hover)',
          accent: 'var(--app-accent)',
          'accent-dim': 'var(--app-accent-dim)',
          'accent-glow': 'var(--app-accent-glow)',
          text: 'var(--app-text)',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
