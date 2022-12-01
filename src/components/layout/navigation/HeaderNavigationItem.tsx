import React from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { styled } from "@mui/material";

export interface NavigationRoute {
  label: string;
  href: string;
  icon?: IconProp;
  mobile?: true;
  isCurrentRoute?: boolean;
}

const HeaderNavigationItem = styled(({ href, label, icon, mobile, className }: NavigationRoute & { className?: string }) => (
  <li className={className}>
    <Link href={href}>
      <a>
        {icon && !mobile && <FontAwesomeIcon icon={icon} size="lg" className="text-primary-dark mr-10" />}
        <span>{label}</span>
      </a>
    </Link>
  </li>
))<NavigationRoute>(({ theme, isCurrentRoute }) => ({
  "& a": {
    display: "inline-block",
    "&:hover": {
      background: "#F8F8F8",
    },
  },
  "& span": {
    display: "inline-block",
    [theme.breakpoints.down("md")]: {
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(1),
      marginTop: theme.spacing(2),
      paddingRight: theme.spacing(1),
      fontWeight: 700,
    },
    [theme.breakpoints.up("md")]: {
      position: "relative",
      paddingTop: theme.spacing(6),
      paddingBottom: theme.spacing(6),
      marginTop: theme.spacing(0),
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(2),
      fontWeight: isCurrentRoute ? 700 : 400,
      "&::after": {
        content: "''",
        position: "absolute",
        width: "2rem",
        bottom: "0.75rem",
        left: 0,
        right: 0,
        margin: "auto",
        borderBottom: isCurrentRoute ? "3px solid #0064af" : undefined,
      },
    },
  },
}));

export default HeaderNavigationItem;
