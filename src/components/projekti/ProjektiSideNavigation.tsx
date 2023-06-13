import React, { FunctionComponent, ReactElement, useCallback, useEffect, useState } from "react";
import HassuLink from "../HassuLink";
import classNames from "classnames";
import { NextRouter, useRouter } from "next/router";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import {
  isVisible,
  KASITTELYN_TILA_ROUTE,
  projektiMeetsMinimumStatus,
  projektinVaiheetNavigaatiossa,
  PROJEKTIN_HENKILOT_ROUTE,
  PROJEKTIN_TIEDOT_ROUTE,
  Route,
} from "src/util/routes";
import ProjektiKortti from "./ProjektiKortti";
import useSnackbars from "src/hooks/useSnackbars";
import useIsAllowedOnCurrentProjektiRoute from "src/hooks/useIsOnAllowedProjektiRoute";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const RouteButtonInternal = useCallback(
    ({ route, topLevel }: { route: Route; topLevel?: boolean }) => {
      return <RouteButton route={route} projekti={projekti} router={router} topLevel={topLevel} />;
    },
    [projekti, router]
  );

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
          <RouteButtonInternal route={PROJEKTIN_HENKILOT_ROUTE} key={0} topLevel />
          <RouteButtonInternal route={PROJEKTIN_TIEDOT_ROUTE} key={1} topLevel />
          <RouteButtonInternal route={KASITTELYN_TILA_ROUTE} key={2} topLevel />
          <ProjektiVaiheDropdownButton router={router} dropdownOpen={dropdownOpen} toggleDropdown={() => setDropdownOpen(!dropdownOpen)} />
          {dropdownOpen &&
            projektinVaiheetNavigaatiossa
              .filter((route) => isVisible(projekti, route))
              .map((route, index) => <RouteButtonInternal route={route} key={index + 3} />)}
        </ul>
      </div>
    </>
  );
};

function RouteButton({
  route,
  projekti,
  router,
  topLevel,
}: {
  route: Route;
  projekti: ProjektiLisatiedolla;
  router: NextRouter;
  topLevel?: boolean;
}) {
  const statusDisabled = !projektiMeetsMinimumStatus(projekti, route.requiredStatus);
  const isSelected = route.requireExactMatch ? route.pathname === router.pathname : router.pathname.startsWith(route.pathname!);
  return (
    <li>
      <HassuLink
        id={"sidenavi_" + route.id}
        href={!statusDisabled ? { pathname: route.pathname, query: { oid: projekti.oid } } : undefined}
        className={classNames(
          "block pr-12 p-4 border-l-4",
          isSelected ? "border-primary" : "border-transparent",
          isSelected && topLevel ? "gb-grey-light" : "",
          statusDisabled ? "text-gray" : "hover:bg-gray-light"
        )}
      >
        {route.title}
      </HassuLink>
    </li>
  );
}

function ProjektiVaiheDropdownButton({
  router,
  dropdownOpen,
  toggleDropdown,
}: {
  router: NextRouter;
  dropdownOpen: boolean;
  toggleDropdown: () => void;
}) {
  const isSelected = projektinVaiheetNavigaatiossa.some((route) =>
    route.requireExactMatch ? route.pathname === router.pathname : router.pathname.startsWith(route.pathname!)
  );
  return (
    <li>
      <div
        id={"sidenavi_projektin_vaiheet"}
        onClick={toggleDropdown}
        className={classNames(
          "block pr-6 p-4 border-l-4",
          isSelected ? "border-primary bg-gray-light" : "border-transparent",
          "hover:bg-gray-light"
        )}
      >
        <span style={{}}>Prosessin vaiheet</span>
        <span style={{ float: "right" }}>
          {dropdownOpen ? (
            <FontAwesomeIcon className="ml-3 text-primary" icon="chevron-up" size="1x" />
          ) : (
            <FontAwesomeIcon className="ml-3 text-primary" icon="chevron-down" size="1x" />
          )}
        </span>
      </div>
    </li>
  );
}
