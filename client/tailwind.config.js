/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0b0e14',
        panel: '#131722',
        panel2: '#1a1f2e',
        border: '#262c3b',
        accent: '#7c5cff',
        accent2: '#5b8cff',
        good: '#34d399',
        bad: '#f87171',
        warn: '#fbbf24',
        muted: '#8b93a7',
      },
    },
  },
  plugins: [],
}
