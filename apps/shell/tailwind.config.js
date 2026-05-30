/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#050608",
          pane: "rgba(10, 11, 14, 0.45)",
          text: "#00f0ff",
          neonCyan: "#00f0ff",
          neonPurple: "#d946ef",
          neonGreen: "#10b981",
          neonOrange: "#f97316",
          neonRed: "#ef4444",
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 240, 255, 0.35), 0 0 20px rgba(0, 240, 255, 0.15)',
        'neon-purple': '0 0 10px rgba(217, 70, 239, 0.35), 0 0 20px rgba(217, 70, 239, 0.15)',
        'neon-green': '0 0 10px rgba(16, 185, 129, 0.35), 0 0 20px rgba(16, 185, 129, 0.15)',
        'neon-orange': '0 0 10px rgba(249, 115, 22, 0.35), 0 0 20px rgba(249, 115, 22, 0.15)',
        'glass': 'inset 0 1px 1px rgba(255, 255, 255, 0.08), 0 12px 30px rgba(0, 0, 0, 0.65)',
        'dock': 'inset 0 1px 2px rgba(255, 255, 255, 0.05), 0 8px 32px rgba(0, 0, 0, 0.8)',
      },
      backgroundImage: {
        'cyber-grid': 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 1px, transparent 1px)',
        'cyber-scanlines': 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
      },
      animation: {
        'scanline-scroll': 'scanline 8s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'matrix-fade': 'matrixFade 1s ease-out infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(0%)' },
          '100%': { transform: 'translateY(100%)' }
        }
      }
    },
  },
  plugins: [],
}
