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
import { useCallback, useState } from "react";
import EiOikeuksiaSivu from "@components/EiOikeuksia";
import { MultiBackend } from "react-dnd-multi-backend";
import { HTML5toTouch } from "rdndmb-html5-to-touch";
import { DndProvider } from "react-dnd";
import SivuaOnMuokattuDialog from "@components/SivuaOnMuokattuDialog";
import LoadingSpinnerProvider from "@components/layout/LoadingSpinnerProvider";
import { FormValidationModeProvider } from "@components/FormValidationModeProvider";
log.setDefaultLevel("DEBUG");

function App(props: AppProps) {
  const { lang, t } = useTranslation("common");
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [showPageHasBeenUpdatedError, setShowPageHasBeenUpdatedError] = useState(false);

  const openPageHasBeenUpdatedError = useCallback(() => {
    setShowPageHasBeenUpdatedError(true);
  }, []);

  const closePageHasBeenUpdatedError = useCallback(() => {
    setShowPageHasBeenUpdatedError(false);
  }, []);

  return (
    <SnackbarProvider>
      <I18nProvider lang={lang} namespaces={{ commonFI, commonSV }}>
        <ApiProvider updateIsUnauthorizedCallback={setIsUnauthorized} simultaneousUpdateErrorCallback={openPageHasBeenUpdatedError}>
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
                <title>{t("common:sivustonimi")}</title>
                <link rel="icon" href="/favicon.ico" />
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                <meta name="msapplication-TileColor" content="#da532c" />
              </Head>
              <HassuMuiThemeProvider>
                <DndProvider backend={MultiBackend} options={HTML5toTouch}>
                  <LoadingSpinnerProvider>
                    <FormValidationModeProvider>
                      <PageContent
                        {...props}
                        isUnauthorized={isUnauthorized}
                        closePageHasBeenUpdatedError={closePageHasBeenUpdatedError}
                        showPageHasBeenUpdatedError={showPageHasBeenUpdatedError}
                      />
                    </FormValidationModeProvider>
                  </LoadingSpinnerProvider>
                </DndProvider>
              </HassuMuiThemeProvider>
            </LocalizationProvider>
          </SWRConfig>
        </ApiProvider>
      </I18nProvider>
    </SnackbarProvider>
  );
}

const PageContent = ({
  Component,
  pageProps,
  isUnauthorized,
  closePageHasBeenUpdatedError,
  showPageHasBeenUpdatedError,
}: AppProps & { isUnauthorized: boolean; showPageHasBeenUpdatedError: boolean; closePageHasBeenUpdatedError: () => void }) => {
  if (isUnauthorized) {
    return <EiOikeuksiaSivu />;
  }

  return (
    <Layout>
      <Component {...pageProps} />
      <SivuaOnMuokattuDialog
        closePageHasBeenUpdatedError={closePageHasBeenUpdatedError}
        showPageHasBeenUpdatedError={showPageHasBeenUpdatedError}
      />
    </Layout>
  );
};

export default App;
