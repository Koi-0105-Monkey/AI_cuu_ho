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
      },
      colors: {
        // Base
        surface: {
          DEFAULT: '#0f1117',
          1: '#161920',
          2: '#1c2028',
          3: '#232731',
          4: '#2a2f3d',
        },
        // Emergency Red accent
        emergency: {
          50:  '#fff1f1',
          100: '#ffe0e0',
          400: '#f87272',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        // Safe Green - GPS track color
        safe: {
          400: '#34d399',
          500: '#10b981',
          DEFAULT: '#1D9E75',
        },
        // Severity badge colors
        severity: {
          low:  '#22c55e',
          med:  '#f59e0b',
          high: '#ef4444',
        },
        // Muted text
        muted: {
          DEFAULT: '#6b7280',
          light: '#9ca3af',
        },
      },
      animation: {
        'pulse-red': 'pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: 0, transform: 'translateY(-6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'surface': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'emergency': '0 0 16px rgba(239, 68, 68, 0.25)',
        'card': '0 2px 12px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
