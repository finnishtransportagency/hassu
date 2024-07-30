import "../../src/styles/globals.css";
import Head from "next/head";

import log from "loglevel";
import { AppProps } from "next/app";
import React from "react";
import HassuMuiThemeProvider from "../../src/components/layout/HassuMuiThemeProvider";

import "@fortawesome/fontawesome-svg-core/styles.css";
const { library } = require("@fortawesome/fontawesome-svg-core");
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
library.add(faExternalLinkAlt);

log.setDefaultLevel("DEBUG");

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Valtion liikenneväylien suunnittelu</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="msapplication-TileColor" content="#da532c" />
      </Head>
      <HassuMuiThemeProvider>
        <Component {...pageProps} />
      </HassuMuiThemeProvider>
    </>
  );
}

export default App;
