/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Base surfaces — tinted dark navy
        surface: {
          DEFAULT: '#0d1525',
          1: '#0d1525',
          2: '#131e33',
          3: '#1a273f',
          4: '#1e293b', // matches --border-subtle
          5: '#28354c',
        },
        // Emergency red
        emergency: {
          50:  '#fff1f1',
          100: '#ffe0e0',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        // Safe (Blue instead of green for colorblind accessibility)
        safe: {
          400: '#38bdf8',
          500: '#0ea5e9',
          DEFAULT: '#0284c7',
        },
        // Severity
        severity: {
          low:  '#0ea5e9', // Blue (safe)
          med:  '#f59e0b', // Orange (warning)
          high: '#e11d48', // Red (critical)
        },
        // Muted text
        muted: {
          DEFAULT: '#687385',
          light: '#94a3b8',
        },
        // Accent gold for premium moments
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
      },
      animation: {
        'pulse-red':    'pulse-red 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow-pulse':   'glow-pulse 3s ease-in-out infinite',
        'slide-in':     'slide-in 0.35s cubic-bezier(0.32,0.72,0,1)',
        'fade-in':      'fade-in 0.4s cubic-bezier(0.32,0.72,0,1)',
        'fade-up':      'fade-up 0.6s cubic-bezier(0.32,0.72,0,1) both',
        'scan-line':    'scan-line 4s linear infinite',
        'float':        'float 6s ease-in-out infinite',
        'spin-slow':    'spin 8s linear infinite',
        'menu-open':    'menu-open 0.4s cubic-bezier(0.32,0.72,0,1) both',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(225, 29, 72, 0.3)' },
          '50%':      { boxShadow: '0 0 40px rgba(225, 29, 72, 0.6)' },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'scan-line': {
          from: { transform: 'translateY(-100%)' },
          to:   { transform: 'translateY(100vh)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'menu-open': {
          from: { opacity: '0', transform: 'translateY(-12px) scale(0.97)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      boxShadow: {
        'surface':    '0 4px 32px rgba(0,0,0,0.5)',
        'emergency':  '0 0 24px rgba(225, 29, 72, 0.35)',
        'safe':       '0 0 16px rgba(16, 185, 129, 0.25)',
        'card':       '0 2px 16px rgba(0,0,0,0.4)',
        'glow-red':   '0 0 32px rgba(225, 29, 72, 0.4), 0 0 64px rgba(225, 29, 72, 0.15)',
        'glow-green': '0 0 24px rgba(16, 185, 129, 0.35)',
        'glass':      '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.06)',
        'inner-highlight': 'inset 0 1px 0 rgba(255,255,255,0.1)',
        'depth':      '0 24px 64px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'gradient-radial':       'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':        'conic-gradient(var(--tw-gradient-stops))',
        'mesh-emergency':        'radial-gradient(ellipse at 20% 50%, rgba(225,29,72,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.06) 0%, transparent 50%)',
        'mesh-dark':             'radial-gradient(ellipse at 30% 80%, rgba(225,29,72,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 10%, rgba(30,64,175,0.08) 0%, transparent 60%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.32, 0.72, 0, 1)',
        'snap':   'cubic-bezier(0.87, 0, 0.13, 1)',
      },
      transitionDuration: {
        '400': '400ms',
      },
    },
  },
  plugins: [],
};
