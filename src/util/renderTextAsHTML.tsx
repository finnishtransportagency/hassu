import htmlReactParser, { DOMNode, domToReact, Element, HTMLReactParserOptions } from "html-react-parser";
import ExtLink from "@components/ExtLink";
import { Link } from "@mui/material";
import React from "react";

let options: HTMLReactParserOptions = {
  replace: (domNode: DOMNode) => {
    if (domNode instanceof Element && domNode.attribs && domNode.name == "a") {
      if (domNode.attribs.external) {
        return <ExtLink href={domNode.attribs.href || ""}>{domToReact(domNode.children, options)}</ExtLink>;
      } else {
        return <Link href={domNode.attribs.href || ""}>{domToReact(domNode.children, options)}</Link>;
      }
    }
  },
};

export function renderTextAsHTML(text?: string | null) {
  if (text) {
    return htmlReactParser(text, options);
  }
}
