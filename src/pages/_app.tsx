import "@styles/globals.css";
import Head from "next/head";
import Layout from "@components/layout/layout";

import log from "loglevel";
import { AppProps as NextAppProps } from "next/app";
import { useState } from "react";
import { RouteLabels } from "@components/layout/Breadcrumbs";

log.setDefaultLevel("DEBUG");

// modified version - allows for custom pageProps type, falling back to 'any'
type AppProps<P = any> = {
  pageProps: P;
} & Omit<NextAppProps<P>, "pageProps">;

export interface PageProps {
  setRouteLabels: (routeLabels: RouteLabels) => void;
}

function App({ Component, pageProps }: AppProps<PageProps>) {
  const [routeLabels, setRouteLabels] = useState<RouteLabels>({});

  pageProps.setRouteLabels = (labels: RouteLabels) => {
    setRouteLabels(labels);
  };

  return (
    <>
      <Head>
        <title>Hassu</title>
      </Head>
      <Layout routeLabels={routeLabels}>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}

export default App;
