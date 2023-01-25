import HassuLink from "@components/HassuLink";
import classNames from "classnames";
import { useRouter } from "next/router";
import React from "react";

interface Route {
  id: string;
  title: string;
  pathname: string;
  requireExactMatch?: boolean;
}

export default function TietoaPalvelustaSideNavigation() {
  const routes: Route[] = [{ title: "Some", pathname: "/", id: "asd" }];
  const router = useRouter();
  return (
    <>
      <div role="navigation" className="bg-gray-lightest">
        <ul>
          {routes.map((route, index) => {
            const isSelected = route.requireExactMatch ? route.pathname === router.pathname : router.pathname.startsWith(route.pathname!);
            return (
              <li key={index}>
                <HassuLink
                  id={"sidenavi_" + route.id}
                  href={{ pathname: route.pathname }}
                  className={classNames(
                    "block pr-12 p-4 border-l-4 hover:bg-gray-light",
                    isSelected ? "border-primary bg-gray-light" : "border-transparent"
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
