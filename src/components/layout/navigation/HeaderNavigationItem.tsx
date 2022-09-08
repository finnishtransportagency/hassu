import React, { ReactElement } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";

export interface NavigationRoute {
  label: string;
  href: string;
  icon?: IconProp;
  children?: Omit<NavigationRoute, "children">[];
}

export function HeaderNavigationItem({ href, label, icon }: NavigationRoute): ReactElement {
  return (
    <li>
      <Link href={href}>
        <a>
          {icon && <FontAwesomeIcon icon={icon} size="lg" className="text-primary-dark mr-10" />}
          {label}
        </a>
      </Link>
    </li>
  );
}

export default HeaderNavigationItem;
