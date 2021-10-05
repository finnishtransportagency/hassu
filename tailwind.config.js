module.exports = {
  purge: ["./src/pages/**/*.{js,ts,jsx,tsx}", "./src/components/**/*.{js,ts,jsx,tsx}"],
  darkMode: false, // or 'media' or 'class'
  mode: "jit",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Exo 2'"],
      },
      backgroundImage: {
        "breadcrumb-arrow": "url('/breadcrumb-arrow.svg')",
      },
    },
    container: {
      center: true,
      padding: "1rem",
      screens: {
        sm: "100%",
        md: "100%",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px",
      },
    },
    colors: {
      primary: {
        dark: "#0064af",
        DEFAULT: "#0099ff",
        light: "#49c2f1",
      },
      secondary: {
        turquoise: "#00b0cc",
        darkGreen: "#207a43",
        green: "#8dcb6d",
        yellow: "#ffc300",
        purple: "#a050a0",
        red: "#c73f00",
        orange: "#ff5100",
        magenta: "#e50083",
      },
      black: "#000000",
      darkGray: "#333333",
      gray: "#999999",
      warmWhite: "#F8F8F8",
      white: "#FFFFFF",
    },
  },
  variants: {
    backgroundColor: ["responsive", "odd", "even", "hover", "focus"],
    extend: {
      opacity: ["disabled"],
      cursor: ["disabled"],
    },
  },
  plugins: [],
};
