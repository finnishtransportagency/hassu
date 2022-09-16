import React, { ComponentProps } from "react";
import Link, { LinkProps } from "next/link";

interface Props {
  useNextLink?: boolean;
  nextLinkOptions?: Omit<LinkProps, "href">;
}

const HassuLink = (
  { href, useNextLink = true, nextLinkOptions = {}, children, ...props }: Props & ComponentProps<"a">,
  ref: React.ForwardedRef<HTMLAnchorElement>
) => {
  if (href && useNextLink) {
    return (
      <Link href={href} {...nextLinkOptions}>
        <a ref={ref} {...props}>
          {children}
        </a>
      </Link>
    );
  } else {
    return (
      <a ref={ref} href={href} {...props}>
        {children}
      </a>
    );
  }
};

export default React.forwardRef(HassuLink);
