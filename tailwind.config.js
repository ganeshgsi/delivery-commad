/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#5f52ff",
          red: "#ff5463",
          "blue-dark": "#5045e6",
          "blue-light": "#8f84ff",
          "red-dark": "#e63d4d",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        premium:
          "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -4px rgba(15, 23, 42, 0.08)",
        "premium-lg":
          "0 4px 6px rgba(15, 23, 42, 0.03), 0 24px 48px -12px rgba(15, 23, 42, 0.12)",
        insetSoft: "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
        brand: "0 8px 24px -4px rgba(95, 82, 255, 0.35)",
        "brand-red": "0 8px 24px -4px rgba(255, 84, 99, 0.35)",
      },
      backgroundImage: {
        "mesh-light":
          "radial-gradient(at 0% 0%, rgba(95, 82, 255, 0.12) 0px, transparent 52%), radial-gradient(at 100% 0%, rgba(255, 84, 99, 0.08) 0px, transparent 48%), radial-gradient(at 100% 100%, rgba(95, 82, 255, 0.06) 0px, transparent 50%)",
        "brand-cta":
          "linear-gradient(90deg, #ff5463 0%, #5f52ff 100%)",
        "brand-soft":
          "linear-gradient(180deg, rgba(95, 82, 255, 0.12) 0%, #ffffff 100%)",
      },
    },
  },
  plugins: [],
};
