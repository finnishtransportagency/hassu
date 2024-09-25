import { faCheck, faMinus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BreakpointsOptions, Components, createTheme, PaletteOptions, ThemeProvider } from "@mui/material";
import { fiFI, Localization, svSE } from "@mui/material/locale";
import { TypographyOptions } from "@mui/material/styles/createTypography";
import { ThemeProviderProps } from "@mui/material/styles/ThemeProvider";
import { alpha, createBreakpoints, SpacingOptions, Theme } from "@mui/system";
import useTranslation from "next-translate/useTranslation";
import React, { ReactNode, useMemo, CSSProperties } from "react";

type Props = { children?: ReactNode };

const primaryDark = "#0064af";
const primary = "#0099ff";
const primaryLight = "#49c2f1";

const palette: PaletteOptions = {
  primary: {
    contrastText: "#ffffff",
    dark: primaryDark,
    main: primary,
    light: primaryLight,
  },
  action: {
    disabled: "#242222",
    disabledBackground: "#f5f5f5",
    disabledOpacity: 1,
  },
  text: {
    primary: "#242222",
  },
  common: {
    black: "#000000",
    white: "#ffffff",
  },
  error: { main: "#f10e0e" },
  grey: {
    100: "#f8f8f8",
    200: "#e5e5e5",
    400: "#c7c7c7",
    500: "#999999",
    900: "#333333",
  },
};

export const breakpointOptions: BreakpointsOptions = {
  values: {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1280,
    xl: 1520,
  },
};

export const breakpoints = createBreakpoints(breakpointOptions);
const spacing: SpacingOptions = (factor: number) => `${0.25 * factor}rem`;

const typography: TypographyOptions = {
  fontFamily: '"Exo 2"',
  allVariants: { color: palette.text?.primary },
  h1: { fontSize: "2.4375rem", lineHeight: 1.231, fontWeight: 700, margin: undefined },
  h2: { fontSize: "1.75rem", lineHeight: 1.143, fontWeight: 700, margin: undefined },
  h3: { fontSize: "1.4375rem", lineHeight: 1.174, fontWeight: 700, margin: undefined },
  h4: { fontSize: "1.25rem", lineHeight: 1.1, fontWeight: 700, margin: undefined },
  h5: { fontSize: "1rem", lineHeight: 1.5, fontWeight: 700, margin: undefined },
  h6: { fontSize: "1rem", lineHeight: 1.5, fontWeight: 700, margin: undefined },
  lead: { fontSize: "1.5rem", fontWeight: 400, lineHeight: 1.333, margin: undefined },
  plain: { fontSize: "1rem" },
};

const theme = createTheme({ spacing, palette, typography }, breakpoints);

export const focusStyle: CSSProperties = {
  outlineWidth: "2px",
  outlineStyle: "solid",
  outlineColor: primaryDark,
  outlineOffset: "-2px",
};

export const focusStyleSecondary: CSSProperties = {
  outlineWidth: "2px",
  outlineStyle: "solid",
  outlineColor: theme.palette.common.white,
  outlineOffset: "-3px",
};

const linearGradientPrimary = `linear-gradient(90deg, ${primaryDark}, ${primaryLight})`;

const components: Components<Omit<Theme, "components">> = {
  MuiContainer: {
    defaultProps: {
      maxWidth: "xl",
      disableGutters: true,
    },
    styleOverrides: {
      root: {
        padding: "0 1rem 0 1rem",
        [theme.breakpoints.up("md")]: {
          padding: "0 2rem 0 2rem",
        },
        [theme.breakpoints.up("xl")]: {
          padding: "0 2.5rem 0 2.5rem",
        },
      },
    },
  },
  MuiStep: {
    styleOverrides: {
      root: {
        "&.MuiStep-horizontal": {
          "&.Mui-focusVisible": focusStyle,
        },
      },
    },
  },
  MuiSwitch: {
    defaultProps: {
      disableRipple: true,
    },
    styleOverrides: {
      root: {
        width: "72px",
        height: "42px",
        paddingLeft: "12px",
        paddingRight: "12px",
        paddingTop: "9px",
        paddingBottom: "9px",
        "& .MuiSwitch-track": {
          backgroundColor: theme.palette.grey["400"],
          opacity: 1,
          borderRadius: 26 / 2,
        },
        "& .MuiSwitch-switchBase": {
          padding: "13px",
          "&.Mui-checked": {
            transform: "translateX(27px)",
            "&.Mui-focusVisible + .MuiSwitch-track": focusStyleSecondary,
            "& + .MuiSwitch-track": {
              backgroundColor: primaryDark,
              opacity: 1,
              border: 0,
            },
          },
          "&.Mui-focusVisible + .MuiSwitch-track": focusStyle,
          "&.Mui-disabled + .MuiSwitch-track": {
            opacity: 1,
            backgroundColor: theme.palette.grey["400"],
          },
          "&.Mui-disabled .MuiSwitch-thumb": {
            color: theme.palette.grey["100"],
          },
          transform: "translateX(3px)",
        },
        "& .MuiSwitch-thumb": {
          boxShadow: "none",
          color: theme.palette.common.white,
          width: "16px",
          height: "16px",
        },
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      icon: {
        right: "14px",
        color: theme.palette.common.black,
      },
    },
    defaultProps: {
      IconComponent: (props) => <FontAwesomeIcon {...props} icon="chevron-down" size="sm" />,
      displayEmpty: true,
    },
  },
  MuiStack: {
    defaultProps: {
      rowGap: 4,
      columnGap: 7,
    },
  },
  MuiRadio: {
    defaultProps: {
      checkedIcon: <span className="hassu-radio hassu-radio-checked" />,
      icon: <span className="hassu-radio hassu-radio-unchecked" />,
      disableFocusRipple: true,
      disableTouchRipple: true,
    },
    styleOverrides: {
      root: {
        "&:hover": {
          backgroundColor: "rgba(0, 153, 255, 0.08)",
        },
        color: "rgba(0, 153, 255, 0.6)",
        "& .hassu-radio": {
          borderRadius: "50%",
          width: "20px",
          height: "20px",
          position: "relative",
          zIndex: 2,
          margin: "2px",
          pointerEvents: "none",
        },
        "& .hassu-radio-unchecked": {
          background: theme.palette.common.white,
          borderColor: theme.palette.grey[900],
          border: "1px solid",
          boxShadow: "inset 0 2px 6px rgb(153, 153, 153, 0.4)",
          color: theme.palette.grey[900],
        },
        "& .hassu-radio-checked": {
          background: primaryDark,
          position: "relative",
          "&::before": {
            content: "''",
            position: "absolute",
            margin: "0px",
            padding: "5.5px",
            top: "50%",
            right: "50%",
            transform: "translate(50%, -50%)",
            borderColor: theme.palette.common.white,
            borderWidth: "2px",
            borderStyle: "solid",
            borderRadius: "50%",
          },
        },
        "&.Mui-focusVisible": {
          ...focusStyle,
          "& .hassu-radio-unchecked": {
            border: "2px solid transparent",
            backgroundClip: "padding-box",
            transformStyle: "preserve-3d",
            "::after": {
              position: "absolute",
              top: "-2px",
              bottom: "-2px",
              left: "-2px",
              right: "-2px",
              background: linearGradientPrimary,
              content: '""',
              transform: "translateZ(-1px)",
              borderRadius: "50%",
            },
          },
          "& .hassu-radio-checked": {
            background: linearGradientPrimary,
          },
        },
        "&.Mui-disabled .hassu-radio": {
          background: theme.palette.grey["400"],
          boxShadow: "none",
          border: "none",
        },
      },
    },
  },
  MuiSvgIcon: {
    styleOverrides: {
      colorPrimary: {
        color: primaryDark,
      },
    },
  },
  MuiIcon: {
    styleOverrides: {
      colorPrimary: {
        color: primaryDark,
      },
    },
  },
  MuiCheckbox: {
    defaultProps: {
      indeterminateIcon: (
        <span className="hassu-checkbox-icon hassu-checkbox-icon-checked">
          <FontAwesomeIcon
            icon={faMinus}
            color={theme.palette.common.white}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "12px",
            }}
          />
        </span>
      ),
      disableRipple: true,
      checkedIcon: (
        <span className="hassu-checkbox-icon hassu-checkbox-icon-checked">
          <FontAwesomeIcon
            icon={faCheck}
            color={theme.palette.common.white}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "12px",
            }}
          />
        </span>
      ),
      icon: <span className="hassu-checkbox-icon hassu-checkbox-icon-unchecked" />,
    },
    styleOverrides: {
      root: {
        "&:hover": {
          backgroundColor: "rgba(0, 153, 255, 0.08)",
        },
        color: "rgba(0, 153, 255, 0.6)",
        "& .hassu-checkbox-icon": {
          width: "20px",
          height: "20px",
          borderRadius: "4px",
          position: "relative",
          zIndex: 2,
          margin: "2px",
          pointerEvents: "none",
        },
        "& .hassu-checkbox-icon-unchecked": {
          background: theme.palette.common.white,
          borderColor: theme.palette.grey[900],
          border: "1px solid",
          boxShadow: "inset 0 2px 6px rgb(153, 153, 153, 0.4)",
          color: theme.palette.grey[900],
        },
        "& .hassu-checkbox-icon-checked": {
          background: primaryDark,
        },
        "&.Mui-focusVisible": {
          ...focusStyle,
          "& .hassu-checkbox-icon-unchecked": {
            border: "2px solid transparent",
            backgroundClip: "padding-box",
            transformStyle: "preserve-3d",
            "::after": {
              position: "absolute",
              top: "-2px",
              bottom: "-2px",
              left: "-2px",
              right: "-2px",
              background: linearGradientPrimary,
              content: '""',
              transform: "translateZ(-1px)",
              borderRadius: "4px",
            },
          },
          "& .hassu-checkbox-icon-checked": {
            background: linearGradientPrimary,
          },
        },
        "&.Mui-disabled .hassu-checkbox-icon": {
          background: theme.palette.grey["400"],
          boxShadow: "none",
          border: "none",
        },
      },
    },
  },
  MuiDialogTitle: {
    defaultProps: {
      component: "div",
    },
    styleOverrides: {
      root: {
        paddingTop: theme.spacing(0),
        paddingLeft: theme.spacing(0),
        paddingRight: theme.spacing(0),
        paddingBottom: theme.spacing(0),
        marginBottom: theme.spacing(7),
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        paddingTop: theme.spacing(0),
        paddingLeft: theme.spacing(0),
        paddingRight: theme.spacing(0),
        paddingBottom: theme.spacing(0),
        marginBottom: theme.spacing(7),
      },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        [theme.breakpoints.up("xs")]: { flexDirection: "column", columnGap: theme.spacing(4) },
        [theme.breakpoints.up("md")]: { flexDirection: "row", columnGap: theme.spacing(7.5) },
        paddingBottom: theme.spacing(0),
        paddingLeft: theme.spacing(0),
        paddingRight: theme.spacing(0),
        paddingTop: theme.spacing(0),
        rowGap: theme.spacing(4),
        alignItems: "flex-end",
      },
    },
    defaultProps: {
      disableSpacing: true,
    },
  },
  MuiLink: {
    defaultProps: {
      color: primaryDark,
      underline: "hover",
      fontSize: "1.125rem",
      lineHeight: 1.222,
    },
  },
  MuiAutocomplete: {
    defaultProps: {
      forcePopupIcon: false,
      disablePortal: true,
    },
    styleOverrides: {
      popper: {
        marginTop: "0 !important",
      },
      option: {
        "&[aria-selected='true']": {
          backgroundColor: "rgba(60,210,255,0.10)",
          "&.Mui-focused": {
            backgroundColor: "rgba(60,210,255,0.20)",
          },
          "&:hover": {
            backgroundColor: "rgba(60,210,255,0.15)",
          },
        },
      },
      inputRoot: {
        padding: 0,
      },
      input: {
        "&.MuiAutocomplete-input": {
          padding: "11px 14px",
        },
      },
    },
  },
  MuiMenuItem: {
    defaultProps: { disableRipple: true },
    styleOverrides: {
      root: {
        "&:hover": {
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        },
        "&.Mui-selected": {
          backgroundColor: "rgba(60,210,255,0.10)",
        },
        "&.Mui-focusVisible": {
          ...focusStyle,
          backgroundColor: "transparent",
        },
        "&.Mui-selected:hover": {
          backgroundColor: "rgba(60,210,255,0.15)",
        },
        "&.Mui-selected.Mui-focusVisible": {
          backgroundColor: "rgba(60,210,255,0.10)",
        },
        "&.Mui-focusVisible:hover": {
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        },
        "&.Mui-focusVisible.Mui-selected:hover": {
          backgroundColor: "rgba(60,210,255,0.15)",
        },
      },
    },
  },
  MuiTab: {
    defaultProps: {
      disableRipple: true,
    },
    styleOverrides: {
      root: {
        paddingTop: "18px",
        paddingBottom: "18px",
        paddingLeft: "40px",
        paddingRight: "40px",
        textTransform: "none",
        fontWeight: 400,
        fontSize: "1rem",
        lineHeight: 1.5,
        color: theme.palette.text.primary,
        opacity: 1,
        "&.Mui-selected:not(.Mui-disabled)": {
          color: primaryDark,
        },
        ":focus-visible": focusStyle,
      },
    },
  },
  MuiTabs: {
    defaultProps: {
      variant: "scrollable",
      scrollButtons: "auto",
    },
    styleOverrides: {
      root: {
        borderBottomWidth: "1px",
        borderStyle: "solid",
        borderColor: theme.palette.grey[500],
      },
      indicator: {
        backgroundColor: primaryDark,
        height: "3px",
      },
    },
  },
  MuiFormControlLabel: {
    styleOverrides: {
      root: {
        alignItems: "start",
        ".MuiFormControlLabel-label": {
          padding: "2px",
          paddingTop: "9px",
          color: theme.palette.text.primary,
          "&.Mui-disabled": {
            color: theme.palette.text.primary,
          },
        },
      },
    },
  },
  MuiIconButton: {
    defaultProps: { color: "primary", disableRipple: true },
    styleOverrides: {
      root: {
        "&.Mui-focusVisible": focusStyle,
        "&:hover": { backgroundColor: alpha(theme.palette.grey[800], 0.05) },
        "&:active": { backgroundColor: alpha(theme.palette.grey[800], 0.1) },
      },
      colorPrimary: {
        "&:hover": { backgroundColor: alpha(primaryDark, 0.05) },
        "&:active": { backgroundColor: alpha(primaryDark, 0.1) },
        color: primaryDark,
      },
    },
  },
  MuiInputBase: {
    styleOverrides: {
      root: {
        "&.MuiInputBase-root": {
          padding: "0",
          "&.MuiInputBase-adornedStart": {
            paddingLeft: "14px",
          },
          "&.MuiInputBase-adornedEnd": {
            paddingRight: "14px",
          },
        },
      },
      input: {
        "&.MuiInputBase-input": {
          padding: "11px 14px",
        },
      },
    },
  },
  MuiOutlinedInput: {
    defaultProps: {
      componentsProps: { input: { size: 15 } },
    },
    styleOverrides: {
      root: {
        borderRadius: "0px",
        minWidth: "200px",
        "& .MuiIconButton-root": {
          color: theme.palette.text.primary,
        },
        "& .MuiOutlinedInput-input": {
          "&:-webkit-autofill": {
            WebkitBoxShadow: "0 0 0 30px white inset",
          },
        },
        "& fieldset.MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.grey[900],
          top: 0,
        },
        "&:hover:not(.Mui-error, .Mui-disabled)": {
          "& fieldset.MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.grey[900],
          },
          "& .MuiIconButton-root": {
            color: theme.palette.grey[900],
          },
        },
        "&.Mui-focused:not(.Mui-error)": {
          "& fieldset.MuiOutlinedInput-notchedOutline": {
            borderColor: primaryDark,
            borderWidth: "2px",
            borderImage: `${linearGradientPrimary} 2`,
          },
          "& .MuiIconButton-root": {
            color: primaryDark,
          },
        },
        backgroundColor: theme.palette.common.white,
        "&.Mui-error": {
          "& fieldset.MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.error.main,
          },
          "& .MuiIconButton-root": {
            color: theme.palette.error.main,
          },
        },
        "&.Mui-disabled": {
          backgroundColor: theme.palette.grey[200],
          "& .MuiInputBase-input.Mui-disabled": {
            WebkitTextFillColor: theme.palette.text.primary,
            color: theme.palette.text.primary,
          },
          "& fieldset.MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.grey[900],
          },
          "& .MuiIconButton-root": {
            color: theme.palette.grey[900],
          },
        },
        "& legend": { display: "none" },
      },
    },
  },
  MuiFormLabel: {
    styleOverrides: {
      asterisk: {
        color: theme.palette.grey[900],
        "&.Mui-focused": {
          color: theme.palette.grey[900],
        },
        "&.Mui-error": {
          color: theme.palette.grey[900],
        },
        "&.Mui-disabled": {
          color: theme.palette.grey[900],
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
        whiteSpace: "normal",
        overflowWrap: "anywhere",
        maxWidth: "fit-content",
        lineHeight: "1.25rem",
        marginBottom: "5px",
        position: "initial",
        transform: "initial",
        overflow: "visible",
        width: "initial",
        "&.Mui-focused": {
          color: theme.palette.grey[900],
        },
        "&.Mui-error": {
          color: theme.palette.grey[900],
        },
        "&.Mui-disabled": {
          color: theme.palette.grey[900],
        },
      },
    },
  },
  MuiFormHelperText: {
    styleOverrides: {
      root: {
        whiteSpace: "normal",
        overflowWrap: "anywhere",
        maxWidth: "none",
        lineHeight: "0.75rem",
        fontSize: "0.75rem",
        marginTop: "8px",
        marginLeft: "0px",
        marginRight: "0px",
      },
    },
  },
};

export const createLocalizedTheme = (locale: Localization) =>
  createTheme(
    theme,
    {
      components,
    },
    locale,
    breakpoints
  );

export default function HassuMuiThemeProvider({ children }: Readonly<Props>) {
  const { lang } = useTranslation();
  const theme = useMemo<ThemeProviderProps["theme"]>(() => createLocalizedTheme(lang === "sv" ? svSE : fiFI), [lang]);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
