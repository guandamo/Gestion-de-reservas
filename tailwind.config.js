/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'verde-principal': '#155A3A',
        'verde-claro': '#E8F5EE',
        'blanco': '#FFFFFF',
        'negro': '#000000',
        'gris-fondo': '#30302E',
        'gris-oscuro': '#151717',
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}