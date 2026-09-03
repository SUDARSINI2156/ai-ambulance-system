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
          dark: '#0a0f1d',
          card: '#111827',
          border: '#1f293d',
          accent: '#06b6d4',
          alert: '#ef4444',
          success: '#10b981',
          warning: '#f59e0b'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'siren': 'siren 0.8s ease-in-out infinite alternate',
      },
      keyframes: {
        siren: {
          '0%': { boxShadow: '0 0 15px rgba(239, 68, 68, 0.8)' },
          '100%': { boxShadow: '0 0 35px rgba(59, 130, 246, 0.9)' },
        }
      }
    },
  },
  plugins: [],
}
