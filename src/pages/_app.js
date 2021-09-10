import Amplify from "aws-amplify";
import "../styles/globals.css";
import Head from "next/head";

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
      <div className="app-container bg-light">
        <div className="container pt-4 pb-4">
          <Component {...pageProps} />
        </div>
      </div>
    </>
  );
}

export default MyApp;
