/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      // Custom scrollbar styling
      scrollbar: {
        DEFAULT: {
          size: '8px',
          track: {
            background: '#e5e7eb', // Light gray for light mode
          },
          thumb: {
            background: '#9ca3af', // Medium gray for light mode
            'hover-background': '#6b7280', // Darker gray on hover
            'border-radius': '4px',
          },
        },
        thin: {
          size: '2px',
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
  ],
}

