import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // R2·FINANCE "editorial paper" palette
        page: '#EFEDE6',
        card: '#FAF9F5',
        ink: '#141413',
        ink2: '#6B6B66',
        ink3: '#A6A29A',
        line: '#E5E3DC',
        accent: '#0047FF',
        good: '#4A7A3C',
        bad: '#A8362B',
      },
      fontFamily: {
        display: ['var(--font-inter-tight)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
