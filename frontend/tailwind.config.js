/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#F6F9FC', // soft, calming cool neutral
        surface: '#FFFFFF',
        clay: {
          light: '#F8FAFC',
          DEFAULT: '#F1F5F9',
          dark: '#E2E8F0',
        },
        // Soft Modern Blue Theme
        blue: {
          50: '#F0F6FE',   // softest ice blue
          100: '#E0EDFD',  // gentle sky tint
          200: '#C2DCFB',  // soft border blue
          300: '#96C4F7',  // calm sky
          400: '#5FA3F1',  // bright sky
          500: '#3B82F6',  // modern vibrant soft blue
          600: '#2563EB',  // primary crisp blue
          700: '#1D4ED8',  // deep serene blue
          800: '#1E40AF',  // midnight blue
          900: '#1E3A8A',  // soft dark navy
          950: '#172554',
        },
        sky: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
        },
        utd: {
          navy: {
            700: '#1D4ED8',
            800: '#1E3A8A',
            850: '#172554',
            900: '#0F1E36',
            950: '#0B1526',
          },
          blue: {
            50: '#F0F6FE',
            100: '#E0EDFD',
            200: '#C2DCFB',
            300: '#96C4F7',
            400: '#5FA3F1',
            500: '#3B82F6',
            600: '#2563EB',
            700: '#1D4ED8',
            800: '#1E40AF',
            900: '#1E3A8A',
          },
          red: {
            50: '#FEF2F2',
            100: '#FEE2E2',
            200: '#FECACA',
            300: '#FCA5A5',
            400: '#F87171',
            500: '#EF4444',
            600: '#DC2626',
            700: '#B91C1C',
            800: '#991B1B',
            900: '#7F1D1D',
          },
        },
      },
      boxShadow: {
        'clay-sm': '0 2px 6px -1px rgba(59, 130, 246, 0.06), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        'clay-card': '0 8px 20px -3px rgba(30, 58, 138, 0.07), 0 3px 8px -2px rgba(0, 0, 0, 0.03)',
        'clay-card-hover': '0 14px 28px -4px rgba(37, 99, 235, 0.12), 0 6px 12px -3px rgba(0, 0, 0, 0.04)',
        'clay-btn': '0 4px 10px -1px rgba(37, 99, 235, 0.22), 0 2px 4px -2px rgba(37, 99, 235, 0.12)',
        'clay-btn-hover': '0 6px 14px -1px rgba(37, 99, 235, 0.3), 0 3px 6px -2px rgba(37, 99, 235, 0.15)',
        'clay-btn-active': 'inset 0 2px 4px rgba(0, 0, 0, 0.15)',
        'clay-inset': 'inset 0 1px 3px rgba(0, 0, 0, 0.06)',
        'clay-floating': '0 20px 30px -5px rgba(30, 58, 138, 0.12), 0 8px 12px -6px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'clay-sm': '12px',
        'clay': '18px',
        'clay-lg': '24px',
        'clay-xl': '30px',
      },
    },
  },
  plugins: [],
};
