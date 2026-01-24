/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: "#00f3ff",
          pink: "#ff00ff",
          green: "#39ff14",
          purple: "#bc13fe",
          yellow: "#ffff00",
          orange: "#ff6600",
        },
        dark: {
          bg: "#050505",
          panel: "#121212",
          surface: "#1a1a1a",
          border: "#2a2a2a",
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'flicker': 'flicker 3s linear infinite',
        'scan': 'scan 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'glitch': 'glitch 1s linear infinite',
        'typing': 'typing 1s steps(3) infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(0, 243, 255, 0.3), 0 0 10px rgba(0, 243, 255, 0.2), 0 0 15px rgba(0, 243, 255, 0.1)',
            borderColor: 'rgba(0, 243, 255, 0.5)'
          },
          '50%': {
            boxShadow: '0 0 10px rgba(0, 243, 255, 0.5), 0 0 20px rgba(0, 243, 255, 0.3), 0 0 30px rgba(0, 243, 255, 0.2)',
            borderColor: 'rgba(0, 243, 255, 1)'
          },
        },
        flicker: {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': { opacity: '1' },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': { opacity: '0.4' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        typing: {
          '0%': { content: "''" },
          '33%': { content: "'.'" },
          '66%': { content: "'..'" },
          '100%': { content: "'...'" },
        },
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
