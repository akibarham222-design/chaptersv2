/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          950: '#05050a',
          900: '#0a0a14',
          800: '#0f0f1e',
          700: '#141428',
          600: '#1a1a35',
          500: '#222244',
        },
        amber: {
          glow: '#f59e0b',
          soft: '#d97706',
          dim: '#92400e',
        },
        signal: {
          red: '#dc2626',
          green: '#16a34a',
          yellow: '#ca8a04',
        },
        smoke: {
          100: '#e8e8f0',
          200: '#c4c4d4',
          400: '#7878a0',
          600: '#4a4a6a',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'Courier New', 'monospace'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'train-slide': 'trainSlide 20s linear infinite',
        'flicker': 'flicker 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-up': 'fadeUp 0.6s ease forwards',
        'steam': 'steam 4s ease-in-out infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        trainSlide: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
          '75%': { opacity: '0.9' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(245,158,11,0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(245,158,11,0.7)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        steam: {
          '0%': { opacity: '0', transform: 'translateY(0) scaleX(1)' },
          '50%': { opacity: '0.6', transform: 'translateY(-30px) scaleX(1.5)' },
          '100%': { opacity: '0', transform: 'translateY(-60px) scaleX(2)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        }
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      }
    }
  },
  plugins: []
}
