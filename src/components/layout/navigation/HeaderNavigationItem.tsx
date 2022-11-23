import React, { FunctionComponent } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import classNames from "classnames";

export interface NavigationRoute {
  label: string;
  href: string;
  icon?: IconProp;
  removeLeftPadding?: boolean;
  mobile?: true;
}

const HeaderNavigationItem: FunctionComponent<NavigationRoute> = ({ href, label, icon, removeLeftPadding, mobile }) => (
  <li>
    <Link href={href}>
      <a
        className={classNames("py-1 mt-2 md:mt-0 md:py-6 md:px-2 pr-1 inline-block font-bold md:font-normal", removeLeftPadding && "pl-0")}
      >
        {icon && !mobile && <FontAwesomeIcon icon={icon} size="lg" className="text-primary-dark mr-10" />}
        {label}
      </a>
    </Link>
  </li>
);

export default HeaderNavigationItem;
