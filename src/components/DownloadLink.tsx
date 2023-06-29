import React from "react";
import { Link, LinkProps } from "@mui/material";
import { FILE_PATH_DELETED_PREFIX } from "../../common/links";
import classNames from "classnames";

const DownloadLink = (
  { href, children, className, ...props }: LinkProps & Omit<React.ComponentProps<typeof Link>, "ref">,
  ref: React.ForwardedRef<HTMLAnchorElement>
) => {
  const isDeleted = !!href && (href as string).startsWith(FILE_PATH_DELETED_PREFIX);
  const actualHref = isDeleted ? undefined : href;
  const classes = ["file_download"];
  if (className) {
    classes.push(className);
  }
  if (isDeleted) {
    classes.push("text-gray");
  }
  const actualClassName = classNames(...classes);

  return (
    <Link href={actualHref} className={actualClassName} underline="none" target="_blank" {...props} ref={ref} aria-disabled={isDeleted}>
      {children}
    </Link>
  );
};

export default React.forwardRef(DownloadLink);
