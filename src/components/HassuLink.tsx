import React, { ComponentProps } from "react";
import Link, { LinkProps } from "next/link";

export type HassuLinkProps = {
  useNextLink?: boolean;
  nextLinkOptions?: Omit<LinkProps, "href">;
  href?: LinkProps["href"];
} & Omit<ComponentProps<"a">, "href">;

const HassuLink = (
  { href, useNextLink = true, nextLinkOptions = {}, children, ...props }: HassuLinkProps,
  ref: React.ForwardedRef<HTMLAnchorElement>
) => {
  if (!!href && useNextLink) {
    return (
      <Link href={href} {...nextLinkOptions}>
        <a ref={ref} {...props}>
          {children}
        </a>
      </Link>
    );
  } else {
    return (
      <a ref={ref} href={typeof href === "string" ? href : undefined} {...props}>
        {children}
      </a>
    );
  }
};

export default React.forwardRef(HassuLink);
