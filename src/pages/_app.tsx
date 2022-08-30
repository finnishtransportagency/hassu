import "@styles/globals.css";
import Head from "next/head";
import Layout from "@components/layout/layout";

import log from "loglevel";
import { AppProps as NextAppProps } from "next/app";
import { useState } from "react";
import { RouteLabels } from "@components/layout/Breadcrumbs";
import { useCallback } from "react";
import "../font-awesome-init";

import useTranslation from "next-translate/useTranslation";
import I18nProvider from "next-translate/I18nProvider";

import commonFI from "../locales/fi/common.json";
import commonSV from "../locales/sv/common.json";
import { SnackbarProvider } from "@components/HassuSnackbarProvider";
import { SWRConfig } from "swr";
import { BreakpointsOptions, createTheme, ThemeProvider } from "@mui/material/styles";
import { SpacingOptions } from "@mui/system";

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
export const theme = createTheme({
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
  },
});

log.setDefaultLevel("DEBUG");

// modified version - allows for custom pageProps type, falling back to 'any'
type AppProps<P = any> = {
  pageProps: P;
} & Omit<NextAppProps<P>, "pageProps">;

export interface PageProps {
  setRouteLabels: (routeLabels: RouteLabels) => void;
}

function App({ Component, pageProps }: AppProps<PageProps>) {
  const { lang } = useTranslation();
  const [routeLabels, setRouteLabels] = useState<RouteLabels>({});

  pageProps.setRouteLabels = useCallback(
    (labels: RouteLabels) => {
      setRouteLabels(labels);
    },
    [setRouteLabels]
  );

  return (
    <SWRConfig value={{ revalidateOnFocus: false, revalidateIfStale: false, revalidateOnReconnect: false }}>
      <I18nProvider lang={lang} namespaces={{ commonFI, commonSV }}>
        <Head>
          <title>Hassu</title>
        </Head>

        <ThemeProvider theme={theme}>
          <SnackbarProvider>
            <Layout routeLabels={routeLabels}>
              <Component {...pageProps} />
            </Layout>
          </SnackbarProvider>
        </ThemeProvider>
      </I18nProvider>
    </SWRConfig>
  );
}

export default App;
