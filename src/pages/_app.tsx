import "@styles/globals.css";
import Head from "next/head";
import Layout from "@components/layout/layout";
import "tailwindcss/tailwind.css";

import log from "loglevel";
import { AppProps } from "next/dist/shared/lib/router/router";

log.setDefaultLevel("DEBUG");

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Hassu</title>
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}

export default App;
