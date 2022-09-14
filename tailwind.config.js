const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/pages/**/*.{js,ts,jsx,tsx}", "./src/components/**/*.{js,ts,jsx,tsx}"],
  corePlugins: {
    fontSize: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Exo 2'", ...defaultTheme.fontFamily.sans],
      },
      backgroundImage: {
        "breadcrumb-arrow": "url('/breadcrumb-arrow.svg')",
      },
    },
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1280px",
      xl: "1520px",
    },
    colors: {
      font: {
        primary: "#242222",
        secondary: "#333333",
        link: "#0064AF",
      },
      primary: {
        dark: "#0064af",
        DEFAULT: "#0099ff",
        light: "#49c2f1",
        lightest: "#EDFAFF",
      },
      turquoise: "#00b0cc",
      green: {
        dark: "#207a43",
        darker: "#54AC54",
        DEFAULT: "#8dcb6d",
        lightest: "#F5FFEF",
      },
      orange: {
        dark: "#F0AD4E",
        DEFAULT: "#ffc300",
        light: "#FFF6E8",
      },
      purple: "#a050a0",
      deepRed: "#c73f00",
      red: "#ff5100",
      fuchsia: { dark: "#e50083", DEFAULT: "#FF70A6", light: "#FFF8FB" },
      black: "#000000",
      gray: {
        darkest: "#333333",
        dark: "#5C5C5C",
        DEFAULT: "#999999",
        light: "#EBEBEB",
        lightest: "#F8F8F8",
      },
      white: "#FFFFFF",
      transparent: "transparent",
    },
  },
  plugins: [],
};
