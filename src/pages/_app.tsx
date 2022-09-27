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
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import HassuMuiThemeProvider from "@components/layout/HassuMuiThemeProvider";
import "dayjs/locale/fi";
import "dayjs/locale/sv";

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
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={lang}>
        <I18nProvider lang={lang} namespaces={{ commonFI, commonSV }}>
          <Head>
            <title>Hassu</title>
          </Head>
          <HassuMuiThemeProvider>
            <SnackbarProvider>
              <Layout routeLabels={routeLabels}>
                <Component {...pageProps} />
              </Layout>
            </SnackbarProvider>
          </HassuMuiThemeProvider>
        </I18nProvider>
      </LocalizationProvider>
    </SWRConfig>
  );
}

export default App;
