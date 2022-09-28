import { BreakpointsOptions, createTheme, ThemeProvider } from "@mui/material";
import { fiFI, Localization, svSE } from "@mui/material/locale";
import { ThemeProviderProps } from "@mui/material/styles/ThemeProvider";
import { SpacingOptions } from "@mui/system";
import useTranslation from "next-translate/useTranslation";
import React, { ReactNode, useMemo } from "react";

type Props = { children?: ReactNode };

export const breakpoints: BreakpointsOptions = {
  values: {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1280,
    xl: 1520,
  },
};

const spacing: SpacingOptions = (factor: number) => `${0.25 * factor}rem`;
const defaultTheme = createTheme({ breakpoints, spacing });

export const createLocalizedTheme = (locale: Localization) =>
  createTheme(
    {
      palette: {
        primary: {
          contrastText: "#ffffff",
          dark: "#0064af",
          main: "#0099ff",
          light: "#49c2f1",
        },
        text: {
          primary: "#242222",
        },
      },
      typography: { fontFamily: '"Exo 2"', allVariants: { color: "#242222" } },
      spacing,
      breakpoints,
      components: {
        MuiContainer: {
          defaultProps: {
            maxWidth: "xl",
            disableGutters: true,
          },
          styleOverrides: {
            root: {
              padding: "0 1rem 0 1rem",
              [defaultTheme.breakpoints.up("md")]: {
                padding: "0 2rem 0 2rem",
              },
              [defaultTheme.breakpoints.up("xl")]: {
                padding: "0 2.5rem 0 2.5rem",
              },
            },
          },
        },
        MuiStack: {
          defaultProps: {
            rowGap: 4,
            columnGap: 7,
          },
        },
        MuiDialogTitle: {
          styleOverrides: {
            root: {
              paddingTop: defaultTheme.spacing(0),
              paddingLeft: defaultTheme.spacing(0),
              paddingRight: defaultTheme.spacing(0),
              paddingBottom: defaultTheme.spacing(0),
              marginBottom: defaultTheme.spacing(7),
            },
          },
        },
        MuiDialogContent: {
          styleOverrides: {
            root: {
              paddingTop: defaultTheme.spacing(0),
              paddingLeft: defaultTheme.spacing(0),
              paddingRight: defaultTheme.spacing(0),
              paddingBottom: defaultTheme.spacing(0),
              marginBottom: defaultTheme.spacing(7),
            },
          },
        },
        MuiDialogActions: {
          styleOverrides: {
            root: {
              [defaultTheme.breakpoints.up("xs")]: { flexDirection: "column" },
              [defaultTheme.breakpoints.up("md")]: { flexDirection: "row" },
              paddingBottom: defaultTheme.spacing(0),
              paddingLeft: defaultTheme.spacing(0),
              paddingRight: defaultTheme.spacing(0),
              paddingTop: defaultTheme.spacing(0),
              columnGap: defaultTheme.spacing(7.5),
              rowGap: defaultTheme.spacing(4),
              alignItems: "flex-end",
            },
          },
          defaultProps: {
            disableSpacing: true,
          },
        },
        MuiLink: {
          defaultProps: {
            color: "#0064AF",
            underline: "hover",
            fontSize: "1.125rem",
            lineHeight: 1.222,
          },
        },
        MuiOutlinedInput: {
          defaultProps: {},
          styleOverrides: {
            root: {
              borderRadius: "0px",
              "& input.MuiOutlinedInput-input": {
                paddingTop: "13px",
                paddingBottom: "13px",
                "&:-webkit-autofill": {
                  WebkitBoxShadow: "0 0 0 30px white inset",
                },
              },
              "& fieldset.MuiOutlinedInput-notchedOutline": {
                borderColor: "#333333",
                top: 0,
              },
              "&:hover:not(.Mui-error, .Mui-disabled) fieldset.MuiOutlinedInput-notchedOutline": {
                borderColor: "#333333",
              },
              "&.Mui-focused:not(.Mui-error) fieldset.MuiOutlinedInput-notchedOutline": {
                borderColor: "#009ae0",
                borderImage: "linear-gradient(117deg, #009ae0, #49c2f1) 2",
              },
              "&.Mui-error fieldset.MuiOutlinedInput-notchedOutline": {
                borderColor: "#F10E0E",
              },
              "& legend": { display: "none" },
            },
          },
        },
        MuiFormLabel: {
          styleOverrides: {
            asterisk: {
              color: "#333333",
              "&.Mui-focused": {
                color: "#333333",
              },
              "&.Mui-error": {
                color: "#333333",
              },
              "&.Mui-disabled": {
                color: "#333333",
              },
            },
          },
        },
        MuiInputLabel: {
          defaultProps: {
            shrink: false,
            translate: "no",
          },
          styleOverrides: {
            root: {
              lineHeight: "1.25rem",
              marginBottom: "5px",
              position: "initial",
              transform: "initial",
              overflow: "visible",
              width: "initial",
              "&.Mui-focused": {
                color: "#333333",
              },
              "&.Mui-error": {
                color: "#333333",
              },
              "&.Mui-disabled": {
                color: "#333333",
              },
            },
          },
        },
        MuiFormHelperText: {
          styleOverrides: {
            root: {
              lineHeight: "0.75rem",
              fontSize: "0.75rem",
              marginTop: "8px",
              marginLeft: "0px",
              marginRight: "0px",
            },
          },
        },
      },
    },
    locale
  );

export default function HassuMuiThemeProvider({ children }: Props) {
  const { lang } = useTranslation();
  const theme = useMemo<ThemeProviderProps["theme"]>(() => createLocalizedTheme(lang === "sv" ? svSE : fiFI), [lang]);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
