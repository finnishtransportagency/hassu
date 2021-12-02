import React from "react";
import Link from "next/link";

interface Props {
  useNextLink?: boolean;
}

const HassuLink = (
  {
    href,
    children,
    useNextLink = true,
    ...props
  }: Props & Omit<React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>, "ref">,
  ref: React.ForwardedRef<HTMLAnchorElement>
) => {
  if (href && useNextLink) {
    return (
      <Link href={href}>
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
