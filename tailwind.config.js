/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        premium:
          "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -4px rgba(15, 23, 42, 0.08)",
        "premium-lg":
          "0 4px 6px rgba(15, 23, 42, 0.03), 0 24px 48px -12px rgba(15, 23, 42, 0.12)",
        insetSoft: "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
      },
      backgroundImage: {
        "mesh-light":
          "radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(14, 165, 233, 0.06) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.05) 0px, transparent 50%)",
      },
    },
  },
  plugins: [],
};
