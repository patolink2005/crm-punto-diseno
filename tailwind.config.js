/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#050505',
        surface: '#121212',
        'industrial-cyan': '#00D2FF',
        'industrial-magenta': '#E6007E',
        accent: {
          DEFAULT: '#00D2FF',
          hover: '#00b8e6',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a0a0a0',
        },
        border: 'rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        'industrial': '4px',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '3rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
