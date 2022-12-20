import "@styles/globals.css";
import Head from "next/head";
import Layout from "@components/layout/layout";

import log from "loglevel";
import { AppProps } from "next/app";
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
import { ApiProvider } from "@components/ApiProvider";

log.setDefaultLevel("DEBUG");

function App({ Component, pageProps }: AppProps) {
  const { lang, t } = useTranslation("common");

  return (
    <SnackbarProvider>
      <I18nProvider lang={lang} namespaces={{ commonFI, commonSV }}>
        <ApiProvider>
          <SWRConfig
            value={{
              revalidateOnFocus: false,
              revalidateIfStale: false,
              revalidateOnReconnect: false,
            }}
          >
            <LocalizationProvider
              dateAdapter={AdapterDayjs}
              adapterLocale={lang}
              localeText={{ okButtonLabel: t("OK"), cancelButtonLabel: t("peruuta") }}
            >
              <Head>
                <title>Hassu</title>
              </Head>
              <HassuMuiThemeProvider>
                <Layout>
                  <Component {...pageProps} />
                </Layout>
              </HassuMuiThemeProvider>
            </LocalizationProvider>
          </SWRConfig>
        </ApiProvider>
      </I18nProvider>
    </SnackbarProvider>
  );
}

export default App;
