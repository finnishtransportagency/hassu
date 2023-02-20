import htmlReactParser, { DOMNode, domToReact, Element, HTMLReactParserOptions } from "html-react-parser";
import React from "react";
import StyledLink, { ExternalStyledLink } from "@components/StyledLink";

let options: HTMLReactParserOptions = {
  replace: (domNode: DOMNode) => {
    if (domNode instanceof Element && domNode.attribs && domNode.name == "a") {
      if (domNode.attribs.external) {
        return (
          <ExternalStyledLink sx={{ fontWeight: 400 }} href={domNode.attribs.href || ""}>
            {domToReact(domNode.children, options)}
          </ExternalStyledLink>
        );
      } else {
        return (
          <StyledLink sx={{ fontWeight: 400 }} href={domNode.attribs.href || ""}>
            {domToReact(domNode.children, options)}
          </StyledLink>
        );
      }
    }
  },
};

export function renderTextAsHTML(text?: string | null) {
  if (text) {
    return htmlReactParser(text, options);
  }
}
