import React, { FunctionComponent, ReactElement, useEffect } from "react";
import HassuLink from "../HassuLink";
import classNames from "classnames";
import { NextRouter, useRouter } from "next/router";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import routes, { isVisible, projektiMeetsMinimumStatus, Route } from "src/util/routes";
import ProjektiKortti from "./ProjektiKortti";
import useSnackbars from "src/hooks/useSnackbars";
import useIsAllowedOnCurrentProjektiRoute from "src/hooks/useIsOnAllowedProjektiRoute";

export default function ProjektiSideNavigationWrapper(): ReactElement {
  const { data: projekti } = useProjekti();

  if (!projekti) {
    return <></>;
  }

  return <ProjektiSideNavigation projekti={projekti} />;
}

const ProjektiSideNavigation: FunctionComponent<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const router = useRouter();
  const { pathnameForAllowedRoute } = useIsAllowedOnCurrentProjektiRoute();
  const { showInfoMessage } = useSnackbars();

  useEffect(() => {
    if (!projekti.nykyinenKayttaja.omaaMuokkausOikeuden) {
      showInfoMessage("Et pääse tarkastelemaan projektin tietoja, sillä et ole projektin jäsen.");
      router.push("/yllapito");
    } else if (pathnameForAllowedRoute) {
      router.push({ pathname: pathnameForAllowedRoute, query: { oid: projekti.oid } });
    }
  }, [pathnameForAllowedRoute, projekti.nykyinenKayttaja.omaaMuokkausOikeuden, projekti.oid, router, showInfoMessage]);

  return (
    <>
      <ProjektiKortti projekti={projekti}></ProjektiKortti>
      <div role="navigation" className="bg-gray-lightest">
        <ul>
          {routes
            .filter((route) => isVisible(projekti, route))
            .map((route, index) => (
              <TopLevelRoute route={route} key={index} projekti={projekti} router={router} />
            ))}
        </ul>
      </div>
    </>
  );
};

function TopLevelRoute({
  route,
  key,
  projekti,
  router,
}: {
  route: Route;
  key: number;
  projekti: ProjektiLisatiedolla;
  router: NextRouter;
}) {
  const statusDisabled = !projektiMeetsMinimumStatus(projekti, route.requiredStatus);
  const isSelected = route.requireExactMatch ? route.pathname === router.pathname : router.pathname.startsWith(route.pathname!);
  return (
    <li key={key}>
      <HassuLink
        id={"sidenavi_" + route.id}
        href={!statusDisabled ? { pathname: route.pathname, query: { oid: projekti.oid } } : undefined}
        className={classNames(
          "block pr-12 p-4 border-l-4",
          isSelected ? "border-primary bg-gray-light" : "border-transparent",
          statusDisabled ? "text-gray" : "hover:bg-gray-light"
        )}
      >
        {route.title}
      </HassuLink>
    </li>
  );
}
