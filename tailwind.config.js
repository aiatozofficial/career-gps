/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Graphik",
          "Graphik LC Web",
          "Graphik Web",
          "Commercial Type Graphik",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif"
        ]
      },
      colors: {
        ink: "#17202a",
        mist: "#f5f7fb",
        sage: "#dff3e8",
        ocean: "#286f8f",
        coral: "#f2715b",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(24, 35, 52, 0.12)",
      },
    },
  },
  plugins: [],
};
