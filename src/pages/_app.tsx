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

import commonFI from "src/locales/fi/common.json";
import commonSV from "src/locales/sv/common.json";
import { SnackbarProvider } from "@components/HassuSnackbarProvider";

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
    <>
      <I18nProvider lang={lang} namespaces={{ commonFI, commonSV }}>
        <SnackbarProvider>
          <Head>
            <title>Hassu</title>
          </Head>

          <Layout routeLabels={routeLabels}>
            <Component {...pageProps} />
          </Layout>
        </SnackbarProvider>
      </I18nProvider>
    </>
  );
}

export default App;
