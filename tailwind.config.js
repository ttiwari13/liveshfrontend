/** @type {import('tailwindcss').Config} */
export default {
  content: [
     "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors:{
        primary: '#007BFF',  // blue
        secondary: '#28A745', // green
        light: '#FFFFFF', // white
        dark: '#000000', // black
      }
    },
  },
  plugins: [],
}

