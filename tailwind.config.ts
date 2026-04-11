import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        surface: '#111111',
        border: '#222222',
        muted: '#888888',
        accent: '#e8ff47',
        success: '#47ffb8',
        danger: '#ff4747',
        warn: '#ffd447',
        cat: {
          food: '#e8ff47',
          personal: '#8b47ff',
          other: '#888888',
          fixed: '#ff6b35',
        },
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'Impact', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'ui-monospace', 'monospace'],
      },
      borderWidth: { hairline: '0.5px' },
    },
  },
  plugins: [],
};
export default config;
