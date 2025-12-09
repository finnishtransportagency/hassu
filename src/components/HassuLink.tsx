import React, { ComponentProps } from "react";
import Link, { LinkProps } from "next/link";

export type HassuLinkProps = {
  useNextLink?: boolean;
  nextLinkOptions?: Omit<LinkProps, "href">;
  href?: LinkProps["href"];
} & Omit<ComponentProps<"a">, "href">;

const HassuLink = ({ href, useNextLink = true, nextLinkOptions = {}, children, ...props }: HassuLinkProps) => {
  if (!!href && useNextLink) {
    return (
      <Link href={href} {...nextLinkOptions} {...props}>
        {children}
      </Link>
    );
  } else {
    return (
      <a href={typeof href === "string" ? href : undefined} {...props}>
        {children}
      </a>
    );
  }
};

export default HassuLink;
