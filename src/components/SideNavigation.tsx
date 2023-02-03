import HassuLink from "@components/HassuLink";
import classNames from "classnames";
import { useRouter } from "next/router";
import React from "react";

export interface Route {
  id: string;
  title: string;
  pathname: string;
  requireExactMatch?: boolean;
  disabled?: boolean;
}

export default function SideNavigation({ routes }: { routes: Route[] }) {
  const router = useRouter();
  return (
    <>
      <div role="navigation" className="bg-gray-lightest">
        <ul>
          {routes.map((route) => {
            const isSelected = route.requireExactMatch ? route.pathname === router.pathname : router.pathname.startsWith(route.pathname!);
            return (
              <li key={route.id}>
                <HassuLink
                  id={"sidenavi_" + route.id}
                  href={{ pathname: route.pathname }}
                  className={classNames(
                    "block pr-12 p-4 border-l-4 hover:underline",
                    isSelected ? "border-primary bg-gray-light" : "border-transparent",
                    route.disabled ? "text-gray" : "hover:bg-gray-light"
                  )}
                >
                  {route.title}
                </HassuLink>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
