/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ocean: {
          50: '#E6F0FF',
          100: '#CCE1FF',
          200: '#99C4FF',
          300: '#66A6FF',
          400: '#3389FF',
          500: '#0A2463',
          600: '#081C4E',
          700: '#061539',
          800: '#040E25',
          900: '#020710',
        },
        teal: {
          50: '#E6F4F8',
          100: '#CCE9F1',
          200: '#99D3E3',
          300: '#66BDD5',
          400: '#3EA4CC',
          500: '#3E92CC',
          600: '#3275A3',
          700: '#25587A',
          800: '#193A52',
          900: '#0C1D29',
        },
        coral: {
          50: '#FFEBE5',
          100: '#FFD7CC',
          200: '#FFAF99',
          300: '#FF8766',
          400: '#FF5F33',
          500: '#F46036',
          600: '#C34D2B',
          700: '#923A20',
          800: '#622616',
          900: '#31130B',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          dark: 'rgba(0, 0, 0, 0.2)',
        }
      },
      backgroundImage: {
        'ocean-gradient': 'linear-gradient(135deg, #0A2463 0%, #3E92CC 50%, #0A2463 100%)',
        'card-gradient': 'linear-gradient(145deg, rgba(10, 36, 99, 0.8) 0%, rgba(62, 146, 204, 0.6) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wave: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
    },
  },
  plugins: [],
};
