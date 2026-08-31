/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        card: '#18181b',
        border: '#27272a',
        primary: '#3b82f6',
        accent: '#10b981',
      }
    },
  },
  plugins: [],
}
