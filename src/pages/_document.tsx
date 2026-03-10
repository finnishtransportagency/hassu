import { Html, Head, Main, NextScript } from "next/document";
import { css, Global } from "@emotion/react";
import Script from "next/script";

const StyledDocument = () => (
  <Html>
    <Head>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <Script src="/assets/__env.js" strategy="beforeInteractive" />
    </Head>
    <body>
      <Main />
      <NextScript />
    </body>
    <Global
      styles={css`
        html,
        body,
        #__next {
          height: 100%;
        }
      `}
    />
  </Html>
);

export default StyledDocument;
