import { Tab, TabProps } from "@mui/material";
import Link, { LinkProps } from "next/link";
import React, { FunctionComponent } from "react";

export type LinkTabProps = TabProps & { linkProps: LinkProps };

export const LinkTab: FunctionComponent<LinkTabProps> = ({ linkProps, ...tabProps }) => (
  <Link {...linkProps} passHref>
    <Tab {...tabProps} />
  </Link>
);
