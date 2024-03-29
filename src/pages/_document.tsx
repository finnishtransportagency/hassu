import { Html, Head, Main, NextScript } from "next/document";
import { css, Global } from "@emotion/react";

const StyledDocument = () => (
  <Html>
    <Head />
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
