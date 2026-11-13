/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bosque: {
          50: "#EAF2EE",
          100: "#CBE0D6",
          200: "#9CC4B0",
          400: "#4E9078",
          500: "#2F6F5E",
          600: "#235747",
          700: "#1A4235",
          900: "#0F2A20",
        },
        terracota: {
          50: "#F7ECE6",
          100: "#EDD1C1",
          400: "#C9835F",
          500: "#B5654A",
          600: "#94503A",
          800: "#5C2F1F",
        },
        crema: {
          50: "#FDFBF7",
          100: "#FAF7F1",
          200: "#F1EAE0",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 42, 32, 0.06), 0 1px 8px rgba(15, 42, 32, 0.05)",
      },
    },
  },
  plugins: [],
};
