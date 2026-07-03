/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        panel2: 'var(--panel2)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-soft': 'var(--accent-soft)',
        accent2: 'var(--accent2)',
        good: 'var(--good)',
        bad: 'var(--bad)',
        warn: 'var(--warn)',
        muted: 'var(--muted)',
        text: 'var(--text)',
        'text-soft': 'var(--text-soft)',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft-sm': '0 1px 2px rgba(0,0,0,0.04)',
        'soft-md': '0 4px 12px rgba(0,0,0,0.06)',
        'soft-lg': '0 10px 30px rgba(0,0,0,0.08)',
        'accent': '0 8px 24px -8px rgba(74,222,128,0.45)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      animation: {
        // fill-mode 'backwards' (не 'both'!): после завершения анимации элемент
        // возвращается к натуральным стилям без transform — иначе сохранённый
        // transform ломает position:fixed у вложенных модалок/попапов.
        'fade-in': 'fadeIn 0.35s var(--ease-smooth) backwards',
        'slide-up': 'slideUp 0.45s var(--ease-smooth) backwards',
        'slide-down': 'slideDown 0.3s var(--ease-smooth) backwards',
        'scale-in': 'scaleIn 0.35s var(--ease-spring) backwards',
        'pop-in': 'popIn 0.5s var(--ease-spring) backwards',
        'pulse-soft': 'pulseSoft 2.2s ease-in-out infinite',
        'shimmer': 'shimmer 1.6s ease-in-out infinite',
        'wiggle': 'wiggle 0.4s ease-in-out',
        'check-pop': 'checkPop 0.4s var(--ease-spring) both',
        'ring-in': 'ringIn 0.8s var(--ease-smooth) both',
        'float': 'float 3.5s ease-in-out infinite',
      },
      keyframes: {
        // ВАЖНО: конечное состояние transform всегда 'none', а не 'translateY(0)'/'scale(1)'.
        // Анимации используют fill-mode both, и сохранившийся transform (даже нулевой)
        // делает элемент containing block для position:fixed потомков — модалки/попапы
        // начинают позиционироваться относительно страницы вместо экрана.
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.7) translateY(6px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.75', transform: 'scale(1.04)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-4deg)' },
          '75%': { transform: 'rotate(4deg)' },
        },
        checkPop: {
          '0%': { opacity: '0', transform: 'scale(0.3) rotate(-15deg)' },
          '60%': { opacity: '1', transform: 'scale(1.15) rotate(3deg)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        ringIn: {
          '0%': { strokeDashoffset: 'var(--ring-circumference)' },
          '100%': { strokeDashoffset: 'var(--ring-offset)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}
