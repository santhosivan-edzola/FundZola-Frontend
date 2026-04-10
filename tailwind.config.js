/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // EdZola brand palette
        coral: {
          50:  '#fdf3ef',
          100: '#fae4da',
          200: '#f5c9b5',
          300: '#eeaa8d',
          400: '#ec9b7e',
          500: '#E8967A',   // primary brand coral
          600: '#d4836a',
          700: '#c4735c',
          800: '#a85f4a',
          900: '#7a3f2f',
        },
        teal: {
          50:  '#f0fafa',
          100: '#d9f1ef',
          200: '#b3e3df',
          300: '#8ECFCA',   // brand teal
          400: '#6bb8b3',
          500: '#4da09b',
          600: '#3a8a85',
          700: '#2d706c',
          800: '#225552',
          900: '#163a38',
        },
        cream: {
          50:  '#fdfcfb',
          100: '#F5F0EB',   // page background
          200: '#ede5dc',
          300: '#e0d4c8',
          400: '#d0bfad',
        },
        peach: '#FAE8DC',
        ez: {
          dark:    '#1A1A1A',
          dark2:   '#2a2a2a',
          dark3:   '#3a3a3a',
          muted:   '#6b6b6b',
          border:  '#e8e0d8',
        },
      },
      fontFamily: {
        sans:    ['"Roboto"', 'system-ui', 'sans-serif'],
        serif:   ['"Roboto"', 'Georgia', 'serif'],
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.25rem',
      },
      boxShadow: {
        card: '0 2px 8px rgba(26,26,26,0.08)',
        'card-hover': '0 4px 16px rgba(26,26,26,0.12)',
      },
    },
  },
  plugins: [],
}
