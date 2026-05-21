import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7f2',
          100: '#e7ecdf',
          200: '#d1dcc2',
          300: '#b6c89e',
          400: '#97b173',
          500: '#799651',
          600: '#617941',
          700: '#4c6035',
          800: '#3f4f2d',
          900: '#354228'
        }
      },
      boxShadow: {
        soft: '0 20px 45px rgba(53, 66, 40, 0.12)'
      }
    },
  },
  plugins: [],
};

export default config;
