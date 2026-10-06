/** @type {import('tailwindcss').Config} */
// Alle Farben kommen aus CSS-Variablen (src/index.css), damit Hell/Dunkel per
// data-theme umgeschaltet werden kann. `<alpha-value>` hält Klassen wie
// bg-brand/10 funktionsfähig.
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: c('bg'),
          card: c('card'),
          elevated: c('elevated'),
        },
        border: {
          DEFAULT: c('border'),
          light: c('border-light'),
          input: c('input-border'),
        },
        // Markenfarbe als Fläche (Buttons, FAB, aktive Chips) – immer mit weißem Text
        primary: {
          DEFAULT: c('primary'),
          hover: c('primary-hover'),
        },
        // Markenfarbe für Text, Icons, Ringe, Tönungen – passt sich dem Theme an
        brand: c('brand'),
        bar: c('bar'),
        accent: c('accent'),
        info: c('info'),
        success: c('success'),
        warning: c('warning'),
        danger: c('danger'),
        text: {
          primary: c('text'),
          secondary: c('text-2'),
          muted: c('text-muted'),
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        glow: 'var(--shadow-glow)',
        'glow-sm': 'var(--shadow-glow-sm)',
        nav: 'var(--shadow-nav)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scanline': 'scanline 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scanline: { '0%, 100%': { top: '0%' }, '50%': { top: '100%' } },
      },
    },
  },
  plugins: [],
}
