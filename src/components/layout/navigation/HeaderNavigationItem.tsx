import React, { useRef, useState } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { styled } from "@mui/material";
import { useRouter } from "next/router";
import useOnClickOutside from "src/hooks/useOnClickOutside";

export interface NavigationRoute {
  label: string;
  href: string;
  icon?: IconProp;
  mobile?: true;
  isCurrentRoute?: boolean;
  requireExactMatch?: boolean;
}

export interface NavigationRouteCollection {
  label: string;
  href: string;
  collection: NavigationRoute[];
  isCurrentRoute?: boolean;
  mobile?: true;
  icon?: IconProp;
  requireExactMatch?: boolean;
}

function NavDropdown({ label, icon, mobile, collection, href }: NavigationRoute & { collection?: NavigationRoute[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  return (
    <div style={{ display: "inline-block" }} ref={ref}>
      <a className={`first-level-link${mobile ? " mobile" : ""}`} onClick={mobile ? () => router.push(href) : () => setOpen(!open)}>
        {icon && !mobile && <FontAwesomeIcon icon={icon} size="lg" className="text-primary-dark mr-10" />}
        <span className={`underline-if-current-route${open ? " open" : " closed"}`}>
          {label}
          {mobile ? null : <FontAwesomeIcon className="ml-2 text-primary" icon="chevron-down" size="lg" />}
        </span>
      </a>
      {collection && (
        <div className={`dropdown${open ? " open" : " closed"}${mobile ? " mobile" : ""}`}>
          {collection.map((route, key) => {
            const isCurrentRoute = route.requireExactMatch ? route.href === router.pathname : router.pathname.startsWith(route.href);
            return <DropdownItem onClick={() => setOpen(false)} isCurrentRoute={isCurrentRoute} key={key} {...route} />;
          })}
        </div>
      )}
    </div>
  );
}

const DropdownItem = ({
  href,
  icon,
  mobile,
  label,
  isCurrentRoute,
  onClick,
}: NavigationRoute & { isCurrentRoute: boolean; onClick: () => void }) => (
  <Link href={href}>
    <a className={`dropdown-item${isCurrentRoute ? " isCurrentRoute" : ""}`} onClick={onClick}>
      {icon && !mobile && <FontAwesomeIcon icon={icon} size="lg" className="text-primary-dark mr-10" />}
      <span>{label}</span>
    </a>
  </Link>
);

const HeaderNavigationItem = styled(
  ({ href, label, icon, mobile, className, collection }: NavigationRoute & { collection?: NavigationRoute[]; className?: string }) => (
    <li className={className}>
      {collection ? (
        <NavDropdown label={label} icon={icon} mobile={mobile} collection={collection} href={href} />
      ) : (
        <Link href={href}>
          <a className={`first-level-link${mobile ? " mobile" : ""}`}>
            {icon && !mobile && <FontAwesomeIcon icon={icon} size="lg" className="text-primary-dark mr-10" />}
            <span className="underline-if-current-route">{label}</span>
          </a>
        </Link>
      )}
    </li>
  )
)<NavigationRoute | NavigationRouteCollection>(({ theme, isCurrentRoute }) => ({
  "& a": {
    "&:hover": {
      background: "#F8F8F8",
    },
  },
  ".dropdown": {
    background: "white",
    "&.mobile": {
      visibility: "hidden",
      display: "none",
      height: 0,
      "> * ": {
        visibility: "hidden",
        display: "none",
        height: 0,
      },
    },
    "&.closed": {
      visibility: "hidden",
      display: "none",
    },
    "&:not(.mobile)": {
      position: "absolute",
      marginTop: "-1em",

      "> .isCurrentRoute": {
        background: "#E0E0E0",
        borderLeft: "3px solid #009ae0",
      },
      " > a": {
        background: "white",
        display: "block",
        borderLeft: "3px solid white",
        "> span": {
          [theme.breakpoints.down("md")]: {
            paddingTop: theme.spacing(1),
            paddingBottom: theme.spacing(1),
            paddingRight: theme.spacing(1),
            fontWeight: 700,
          },
          [theme.breakpoints.up("md")]: {
            position: "relative",
            paddingTop: theme.spacing(2),
            paddingBottom: theme.spacing(2),
            paddingLeft: theme.spacing(3),
            paddingRight: theme.spacing(3),
            fontWeight: 400,
          },
        },
      },
    },
  },
  "& a.first-level-link": {
    display: "inline-block",
    cursor: "pointer",
    textTransform: "uppercase",
    [theme.breakpoints.down("md")]: {
      marginTop: theme.spacing(2.5),
    },
    [theme.breakpoints.up("md")]: {
      marginTop: theme.spacing(0),
    },
    "&.mobile": {
      "> span": {
        [theme.breakpoints.down("md")]: {
          fontWeight: 700,
        },
      },
    },
    "> span": {
      [theme.breakpoints.down("md")]: {
        paddingTop: theme.spacing(1),
        paddingBottom: theme.spacing(1),
        paddingRight: theme.spacing(1),
        fontWeight: 400,
      },
      [theme.breakpoints.up("md")]: {
        position: "relative",
        paddingTop: theme.spacing(6),
        paddingBottom: theme.spacing(6),
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
      },
    },
  },
  "a > span": {
    display: "inline-block",
  },
  "span.underline-if-current-route": {
    [theme.breakpoints.up("md")]: {
      fontWeight: isCurrentRoute ? 700 : 400,
      "&::after": {
        content: "''",
        position: "absolute",
        width: "2rem",
        bottom: "0.75rem",
        left: 0,
        right: 0,
        margin: "auto",
      },
      "&.closed": {
        "&::after": {
          content: "''",
          position: "absolute",
          width: "2rem",
          bottom: "0.75rem",
          left: 0,
          right: 0,
          borderBottom: isCurrentRoute ? "3px solid #0064af" : undefined,
        },
      },
    },
  },
}));

export default HeaderNavigationItem;
