/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'SF Pro Text', '-apple-system', 'system-ui', 'sans-serif'],
        display: ['Inter', 'SF Pro Display', '-apple-system', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          orange: '#FF6C00',
          hover: '#E66100',
          soft: '#FFF3E8',
          deep: '#C24F00',
          ink: '#1A1A1A',
          ink2: '#3A3A3A',
          muted: '#6B7280',
          line: '#E6E6E6',
          bg: '#FFFFFF',
          bgSoft: '#F6F7F9',
          dark: '#0f0f0f',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'brand': '0 18px 50px rgba(255, 108, 0, 0.15)',
        'card': '0 4px 24px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};

