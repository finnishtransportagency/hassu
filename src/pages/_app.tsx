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
import { useState } from "react";
import ConditionalWrapper from "@components/layout/ConditionalWrapper";
import EiOikeuksiaSivu from "@components/EiOikeuksia";

log.setDefaultLevel("DEBUG");

// const pathnamesWithoutLayout: string[] = [];

function App(props: AppProps) {
  const { lang, t } = useTranslation("common");
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  return (
    <SnackbarProvider>
      <I18nProvider lang={lang} namespaces={{ commonFI, commonSV }}>
        <ApiProvider updateIsUnauthorizedCallback={setIsUnauthorized}>
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
              </Head>
              <HassuMuiThemeProvider>
                <PageContent {...props} isUnauthorized={isUnauthorized} />
              </HassuMuiThemeProvider>
            </LocalizationProvider>
          </SWRConfig>
        </ApiProvider>
      </I18nProvider>
    </SnackbarProvider>
  );
}

const PageContent = ({ Component, pageProps, isUnauthorized }: AppProps & { isUnauthorized: boolean }) => {
  // const router = useRouter();
  // const showLayout = useMemo<boolean>(() => !pathnamesWithoutLayout.includes(router.pathname), [router.pathname]);

  if (isUnauthorized) {
    return <EiOikeuksiaSivu />;
  }

  return (
    <ConditionalWrapper condition={true} wrapper={Layout}>
      <Component {...pageProps} />
    </ConditionalWrapper>
  );
};

export default App;
