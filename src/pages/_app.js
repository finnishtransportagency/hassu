import "../styles/globals.css";
import Head from "next/head";
import { Layout } from "../components/layout";

import log from "loglevel";

log.setDefaultLevel("DEBUG");

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Hassu</title>

        {/* bootstrap css */}
        <link href="//netdna.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet" />
      </Head>
      <div className="container bg-light">
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </div>
    </>
  );
}

export default MyApp;
