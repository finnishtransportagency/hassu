import { Tab, TabProps } from "@mui/material";
import Link, { LinkProps } from "next/link";
import React, { FC } from "react";

export type LinkTabProps = TabProps & { linkProps: LinkProps };

export const LinkTab: FC<LinkTabProps> = ({ linkProps, ...tabProps }) => (
  <Link {...linkProps} passHref>
    <Tab {...tabProps} />
  </Link>
);
