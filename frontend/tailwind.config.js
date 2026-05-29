/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta cinematográfica personalizada
        cinema: {
          base: '#f5f5f7',
          card: '#ffffff',
          elevated: '#fafafa',
          border: '#e5e5e7',
          'border-strong': '#d1d1d6',
        },
        'cinema-dark': {
          base: '#0a0a0f',
          card: '#141419',
          elevated: '#1c1c24',
          border: '#1f1f28',
          'border-strong': '#2c2c36',
        },
        gold: {
          DEFAULT: '#d4af37',
          light: '#f0c74e',
          dark: '#b8960b',
          muted: 'rgba(212, 175, 55, 0.12)',
        },
        crimson: {
          DEFAULT: '#e63946',
          dark: '#c41e3a',
        },
        // Mapeo de colores semánticos para compatibilidad
        slate: {
          50: '#f5f5f7',
          100: '#eaeaea',
          200: '#e5e5e7',
          300: '#d1d1d6',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#636366',
          700: '#48484f',
          800: '#2c2c36',
          850: '#1f1f28',
          900: '#141419',
          950: '#0a0a0f',
        },
        accent: {
          DEFAULT: '#d4af37',
          dark: '#b8960b',
          light: '#f0c74e',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Bebas Neue', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'cinema': '0 4px 24px rgba(0, 0, 0, 0.06)',
        'cinema-dark': '0 4px 24px rgba(212, 175, 55, 0.06)',
        'cinema-lg': '0 8px 40px rgba(0, 0, 0, 0.10)',
        'cinema-lg-dark': '0 8px 40px rgba(212, 175, 55, 0.08)',
      },
    },
  },
  plugins: [],
}
