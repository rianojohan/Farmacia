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
        // Paleta definida con variables CSS para poder cambiarla por completo
        // en modo oscuro (html.dark) sin editar cada pantalla.
        bosque: {
          50: "rgb(var(--c-bosque-50) / <alpha-value>)",
          100: "rgb(var(--c-bosque-100) / <alpha-value>)",
          200: "rgb(var(--c-bosque-200) / <alpha-value>)",
          400: "rgb(var(--c-bosque-400) / <alpha-value>)",
          500: "rgb(var(--c-bosque-500) / <alpha-value>)",
          600: "rgb(var(--c-bosque-600) / <alpha-value>)",
          700: "rgb(var(--c-bosque-700) / <alpha-value>)",
          900: "rgb(var(--c-bosque-900) / <alpha-value>)",
        },
        terracota: {
          50: "rgb(var(--c-terracota-50) / <alpha-value>)",
          100: "rgb(var(--c-terracota-100) / <alpha-value>)",
          400: "rgb(var(--c-terracota-400) / <alpha-value>)",
          500: "rgb(var(--c-terracota-500) / <alpha-value>)",
          600: "rgb(var(--c-terracota-600) / <alpha-value>)",
          800: "rgb(var(--c-terracota-800) / <alpha-value>)",
        },
        crema: {
          50: "rgb(var(--c-crema-50) / <alpha-value>)",
          100: "rgb(var(--c-crema-100) / <alpha-value>)",
          200: "rgb(var(--c-crema-200) / <alpha-value>)",
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
