/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // 👈 ต้องเป็นคำนี้เป๊ะๆ
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};