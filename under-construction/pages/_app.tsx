import "../../src/styles/globals.css";
import Head from "next/head";

import log from "loglevel";
import { AppProps } from "next/app";
import { useRouter } from "next/dist/client/router";
import React from "react";
import HassuMuiThemeProvider from "../../src/components/layout/HassuMuiThemeProvider";

log.setDefaultLevel("DEBUG");

function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Hassu</title>
      </Head>
      <HassuMuiThemeProvider>
        <Component {...pageProps} />
      </HassuMuiThemeProvider>
    </>
  );
}

export default App;
