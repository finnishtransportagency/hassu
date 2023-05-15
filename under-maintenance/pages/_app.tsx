import "../../src/styles/globals.css";
import Head from "next/head";

import log from "loglevel";
import { AppProps } from "next/app";
import React from "react";
import HassuMuiThemeProvider from "../../src/components/layout/HassuMuiThemeProvider";

import { library } from "@fortawesome/fontawesome-svg-core";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
library.add(faExternalLinkAlt);

log.setDefaultLevel("DEBUG");

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Valtion liikenneväylien suunnittelu</title>
      </Head>
      <HassuMuiThemeProvider>
        <Component {...pageProps} />
      </HassuMuiThemeProvider>
    </>
  );
}

export default App;
