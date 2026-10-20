import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effcfa',
          100: '#ccfbf1',
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
        },
        coral: {
          50: '#fff1ee',
          100: '#ffe0d9',
          500: '#ff6b57',
          600: '#f2503b',
          700: '#d93f2b',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;