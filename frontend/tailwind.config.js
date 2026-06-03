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
          cyan: "#00ffff",
          emerald: "#00e676",
          dark: "#05080c",
          slate: "#0b1118",
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['Space Grotesk', 'monospace'],
      }
    },
  },
  plugins: [],
}
