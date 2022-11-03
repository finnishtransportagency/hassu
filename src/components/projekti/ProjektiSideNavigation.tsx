import React, { FC, ReactElement, useEffect } from "react";
import HassuLink from "../HassuLink";
import classNames from "classnames";
import { useRouter } from "next/router";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { isVisible, projektiMeetsMinimumStatus, routes, useIsAllowedOnCurrentProjektiRoute } from "src/hooks/useIsOnAllowedProjektiRoute";
import ProjektiKortti from "./ProjektiKortti";

export default function ProjektiSideNavigationWrapper(): ReactElement {
  const { data: projekti } = useProjekti();

  if (!projekti) {
    return <></>;
  }

  return <ProjektiSideNavigation projekti={projekti} />;
}

const ProjektiSideNavigation: FC<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const router = useRouter();
  const { pathnameForAllowedRoute } = useIsAllowedOnCurrentProjektiRoute();

  useEffect(() => {
    if (pathnameForAllowedRoute) {
      router.push({ pathname: pathnameForAllowedRoute, query: { oid: projekti.oid } });
    }
  }, [pathnameForAllowedRoute, projekti.oid, router]);

  return (
    <>
      <ProjektiKortti projekti={projekti}></ProjektiKortti>
      <div role="navigation" className="bg-gray-lightest">
        <ul>
          {routes
            .filter((route) => isVisible(projekti, route))
            .map((route, index) => {
              const statusDisabled = !projektiMeetsMinimumStatus(projekti, route.requiredStatus);
              return (
                <li key={index}>
                  <HassuLink
                    id={"sidenavi_" + route.id}
                    href={!statusDisabled ? { pathname: route.pathname, query: { oid: projekti.oid } } : undefined}
                    className={classNames(
                      "block pr-12 p-4 border-l-4",
                      router.pathname === route.pathname ? "border-primary bg-gray-light" : "border-transparent",
                      statusDisabled ? "text-gray" : "hover:bg-gray-light"
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
};
