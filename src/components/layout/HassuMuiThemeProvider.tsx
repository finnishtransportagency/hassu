import { faCheck, faMinus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BreakpointsOptions, createTheme, ThemeProvider } from "@mui/material";
import { fiFI, Localization, svSE } from "@mui/material/locale";
import { ThemeProviderProps } from "@mui/material/styles/ThemeProvider";
import { createBreakpoints, SpacingOptions } from "@mui/system";
import useTranslation from "next-translate/useTranslation";
import React, { ReactNode, useMemo } from "react";

type Props = { children?: ReactNode };

export const focusStyle = {
  outline: "2px #0063B5 solid",
  outlineOffset: "-2px",
}

export const focusStyleSecondary = {
  outline: "2px #FFFFFF solid",
  outlineOffset: "-3px",
}

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
const defaultTheme = createTheme({ spacing }, breakpoints);

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
      typography: {
        fontFamily: '"Exo 2"',
        allVariants: { color: "#242222" },
        h1: { fontSize: "2.4375rem", lineHeight: 1.231, fontWeight: 700, margin: undefined },
        h2: { fontSize: "1.75rem", lineHeight: 1.143, fontWeight: 700, margin: undefined },
        h3: { fontSize: "1.4375rem", lineHeight: 1.174, fontWeight: 700, margin: undefined },
        h4: { fontSize: "1.25rem", lineHeight: 1.1, fontWeight: 700, margin: undefined },
        h5: { fontSize: "1rem", lineHeight: 1.5, fontWeight: 700, margin: undefined },
        h6: { fontSize: "1rem", lineHeight: 1.5, fontWeight: 700, margin: undefined },
        lead: { fontSize: "1.5rem", fontWeight: 400, lineHeight: 1.333, margin: undefined },
      },
      spacing,
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
        MuiStep: {
          styleOverrides: {
            root: {
              '&.MuiStep-horizontal': {
                '&.Mui-focusVisible': focusStyle,
              }
            }
          }
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
                backgroundColor: "#C7C7C7",
                opacity: 1,
                borderRadius: 26 / 2,
              },
              "& .MuiSwitch-switchBase": {
                padding: "13px",
                "&.Mui-checked": {
                  transform: "translateX(27px)",
                  "& + .MuiSwitch-track": {
                    backgroundColor: "#0064AF",
                    opacity: 1,
                    border: 0,
                  },
                },
                '&.Mui-focusVisible': focusStyle,
                "&.Mui-disabled + .MuiSwitch-track": {
                  opacity: 1,
                  backgroundColor: "#C7C7C7",
                },
                "&.Mui-disabled .MuiSwitch-thumb": {
                  color: "#E5E5E5",
                },
                transform: "translateX(3px)",
              },
              "& .MuiSwitch-thumb": {
                boxShadow: "none",
                color: "#FFFFFF",
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
              color: "#000000",
            },
          },
          defaultProps: {
            IconComponent: (props) => {
              return <FontAwesomeIcon {...props} icon="chevron-down" size="sm" />;
            },
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
                background: "#FFFFFF",
                borderColor: "#333333",
                border: "1px solid",
                boxShadow: "inset 0 2px 6px rgb(153, 153, 153, 0.4)",
                color: "#333333",
              },
              "& .hassu-radio-checked": {
                background: "#0064AF",
                position: "relative",
                "&::before": {
                  content: "''",
                  position: "absolute",
                  margin: "0px",
                  padding: "5.5px",
                  top: "50%",
                  right: "50%",
                  transform: "translate(50%, -50%)",
                  border: "2px solid #FFFFFF",
                  borderRadius: "50%",
                },
              },
              "&.Mui-focusVisible .hassu-radio-unchecked": {
                border: "2px solid transparent",
                backgroundClip: "padding-box",
                transformStyle: "preserve-3d",
              },
              "&.Mui-focusVisible .hassu-radio-unchecked::after": {
                position: "absolute",
                top: "-2px",
                bottom: "-2px",
                left: "-2px",
                right: "-2px",
                background: "linear-gradient(117deg, #0064AF, #49c2f1)",
                content: '""',
                transform: "translateZ(-1px)",
                borderRadius: "50%",
              },
              "&.Mui-disabled .hassu-radio": {
                background: "#C7C7C7",
                boxShadow: "none",
                border: "none",
              },
              "&.Mui-focusVisible .hassu-radio-checked": {
                background: "linear-gradient(117deg, #0064AF, #49c2f1)",
              },
            },
          },
        },
        MuiCheckbox: {
          defaultProps: {
            indeterminateIcon: (
              <span className="hassu-checkbox-icon hassu-checkbox-icon-checked">
                <FontAwesomeIcon
                  icon={faMinus}
                  color="#FFFFFF"
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
                  color="#FFFFFF"
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
                background: "#FFFFFF",
                borderColor: "#333333",
                border: "1px solid",
                boxShadow: "inset 0 2px 6px rgb(153, 153, 153, 0.4)",
                color: "#333333",
              },
              "& .hassu-checkbox-icon-checked": {
                background: "#0064AF",
              },
              "&.Mui-focusVisible .hassu-checkbox-icon-unchecked": {
                border: "2px solid transparent",
                backgroundClip: "padding-box",
                transformStyle: "preserve-3d",
              },
              "&.Mui-focusVisible .hassu-checkbox-icon-unchecked::after": {
                position: "absolute",
                top: "-2px",
                bottom: "-2px",
                left: "-2px",
                right: "-2px",
                background: "linear-gradient(117deg, #0064AF, #49c2f1)",
                content: '""',
                transform: "translateZ(-1px)",
                borderRadius: "4px",
              },
              "&.Mui-disabled .hassu-checkbox-icon": {
                background: "#C7C7C7",
                boxShadow: "none",
                border: "none",
              },
              "&.Mui-focusVisible .hassu-checkbox-icon-checked": {
                background: "linear-gradient(117deg, #0064AF, #49c2f1)",
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
              [defaultTheme.breakpoints.up("xs")]: { flexDirection: "column", columnGap: defaultTheme.spacing(4) },
              [defaultTheme.breakpoints.up("md")]: { flexDirection: "row", columnGap: defaultTheme.spacing(7.5) },
              paddingBottom: defaultTheme.spacing(0),
              paddingLeft: defaultTheme.spacing(0),
              paddingRight: defaultTheme.spacing(0),
              paddingTop: defaultTheme.spacing(0),
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
              "&.Mui-selected": {
                backgroundColor: "rgba(60,210,255,0.10)",
                "&:hover": {
                  backgroundColor: "rgba(60,210,255,0.15)",
                },
              },
              "&:focus": {
                backgroundColor: "transparent",
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
              color: "#242222",
              opacity: 1,
              "&.Mui-selected:not(.Mui-disabled)": {
                color: "#0064AF",
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
              borderBottom: "1px #979797 solid",
            },
            indicator: {
              backgroundColor: "#0064AF",
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
                color: "#242222",
                "&.Mui-disabled": {
                  color: "#242222",
                },
              },
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              color: "#0064AF",
              "&:hover": {
                backgroundColor: "rgba(0, 153, 255, 0.08)",
              },
              "& .MuiTouchRipple-child": {
                color: "rgba(0, 153, 255, 1)",
              },
              "&:focus-visible": focusStyleSecondary,
            },
            colorPrimary: {
              color: "#0064AF",
              "&:hover": {
                backgroundColor: "rgba(0, 153, 255, 0.08)",
              },
              "& .MuiTouchRipple-child": {
                color: "rgba(0, 153, 255, 1)",
              },
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
                color: "#242222",
              },
              "& .MuiOutlinedInput-input": {
                "&:-webkit-autofill": {
                  WebkitBoxShadow: "0 0 0 30px white inset",
                },
              },
              "& fieldset.MuiOutlinedInput-notchedOutline": {
                borderColor: "#333333",
                top: 0,
              },
              "&:hover:not(.Mui-error, .Mui-disabled)": {
                "& fieldset.MuiOutlinedInput-notchedOutline": {
                  borderColor: "#333333",
                },
                "& .MuiIconButton-root": {
                  color: "#333333",
                },
              },
              "&.Mui-focused:not(.Mui-error)": {
                "& fieldset.MuiOutlinedInput-notchedOutline": {
                  borderColor: "#0064AF",
                },
                "& .MuiIconButton-root": {
                  color: "#0064AF",
                },
              },
              backgroundColor: "#FFFFFF",
              "&.Mui-error": {
                "& fieldset.MuiOutlinedInput-notchedOutline": {
                  borderColor: "#F10E0E",
                },
                "& .MuiIconButton-root": {
                  color: "#F10E0E",
                },
              },
              "&.Mui-disabled": {
                backgroundColor: "#E5E5E5",
                "& .MuiInputBase-input.Mui-disabled": {
                  WebkitTextFillColor: "#242222",
                  color: "#242222",
                },
                "& fieldset.MuiOutlinedInput-notchedOutline": {
                  borderColor: "#333333",
                },
                "& .MuiIconButton-root": {
                  color: "#333333",
                },
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
      },
    },
    locale,
    breakpoints
  );

export default function HassuMuiThemeProvider({ children }: Props) {
  const { lang } = useTranslation();
  const theme = useMemo<ThemeProviderProps["theme"]>(() => createLocalizedTheme(lang === "sv" ? svSE : fiFI), [lang]);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
