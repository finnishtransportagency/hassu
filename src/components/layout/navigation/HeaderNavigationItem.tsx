import React, { useCallback, useRef } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { listClasses, Menu, MenuItem, styled } from "@mui/material";
import router, { useRouter } from "next/router";
import useEnterIsClick from "src/hooks/useEnterIsClick";
import { Kieli } from "../../../../common/graphql/apiModel";
import { userIsAdmin } from "common/util/userRights";
import useCurrentUser from "src/hooks/useCurrentUser";
import { useIsYllapito } from "src/hooks/useIsYllapito";

export interface NavigationRoute {
  label: string;
  href: string;
  icon?: IconProp;
  mobile?: true;
  isCurrentRoute?: boolean;
  requireExactMatch?: boolean;
  excludeInLanguage?: Kieli;
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
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const router = useRouter();
  const ref = useRef(null);
  useEnterIsClick("main-nav-dropdown-button");
  const isYllapito = useIsYllapito();
  const { data: kayttaja } = useCurrentUser(isYllapito);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const openMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      handleClick(event);
      const currentRoute = collection?.find((route) => {
        return route.requireExactMatch ? route.href === router.pathname : router.pathname.startsWith(route.href);
      });
      const indexOfCurrentRoute = currentRoute ? collection?.indexOf(currentRoute) : 0;
      setTimeout(() => {
        // Asetetaan timeout, koska menu ei ole vielä auki
        const elementToFocusOn =
          indexOfCurrentRoute && indexOfCurrentRoute >= 0 ? document.getElementById(`item-in-dropdown-${indexOfCurrentRoute}`) : null;
        if (elementToFocusOn) {
          elementToFocusOn.focus();
        }
      }, 100);
    },
    [collection, router.pathname]
  );

  return (
    <>
      {(label !== "Pääkäyttäjätoiminnot" || (isYllapito && userIsAdmin(kayttaja))) && (
        <div style={{ display: "inline-block" }} ref={ref}>
          <a
            id="main-nav-dropdown-button"
            tabIndex={0}
            className={`first-level-link${mobile ? " mobile" : ""}`}
            onClick={
              mobile
                ? () => {
                    router.push(href);
                  }
                : openMenu
            }
          >
            {icon && !mobile && <FontAwesomeIcon icon={icon} size="lg" className="text-primary-dark mr-10" />}
            <span className={`underline-if-current-route${open ? " open" : " closed"}`}>
              {label}
              {mobile ? null : <FontAwesomeIcon className="ml-2 text-primary" icon="chevron-down" size="lg" />}
            </span>
          </a>
          {collection && (
            <HassuMenu
              id="main-nav-dropdown-menu"
              open={open}
              anchorEl={anchorEl}
              onClose={handleClose}
              className={`${mobile ? " mobile" : ""}`}
            >
              {collection.map((route, key) => {
                const isCurrentRoute = route.requireExactMatch ? route.href === router.pathname : router.pathname.startsWith(route.href);
                return (
                  <DropdownItem onClick={handleClose} isCurrentRoute={isCurrentRoute} key={key} id={`item-in-dropdown-${key}`} {...route} />
                );
              })}
            </HassuMenu>
          )}
        </div>
      )}
    </>
  );
}

const HassuMenu = styled(Menu)(() => ({
  transform: "translateY(-1em)",
  [`.${listClasses.root}`]: {
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
    "> li": {
      "&.isCurrentRoute": {
        background: "#E0E0E0",
        borderLeft: "3px solid #009ae0",
      },
      "& :hover": {
        textDecoration: "underline",
      },
    },
  },
}));

function DropdownItem({
  id,
  href,
  icon,
  mobile,
  label,
  isCurrentRoute,
  onClick,
}: NavigationRoute & { id: string; isCurrentRoute: boolean; onClick: () => void }) {
  useEnterIsClick(`item-in-dropdown-${id}`);

  return (
    <MenuItem
      id={id}
      className={`${isCurrentRoute ? " isCurrentRoute" : ""}`}
      onClick={() => {
        onClick();
        router.push(href);
      }}
      tabIndex={0}
    >
      <a>
        {icon && !mobile && <FontAwesomeIcon icon={icon} size="lg" className="text-primary-dark mr-10" />}
        <span>{label}</span>
      </a>
    </MenuItem>
  );
}

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
