import React, { FC, ReactElement, useEffect } from "react";
import HassuLink from "../HassuLink";
import styles from "@styles/projekti/ProjektiSideNavigation.module.css";
import classNames from "classnames";
import { useRouter } from "next/router";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { Status } from "@services/api";
import ProjektiKortti from "./ProjektiKortti";
interface Route {
  title: string;
  requiredStatus: Status;
  pathname?: string;
}

function statusOrdinal(status: Status): number {
  return Object.values(Status).indexOf(status);
}

export default function ProjektiSideNavigationWrapper(): ReactElement {
  const { data: projekti } = useProjekti();

  if (!projekti) {
    return <></>;
  }

  return <ProjektiSideNavigation projekti={projekti} />;
}

const routes: Route[] = [
  {
    title: "Projektin henkilöt",
    requiredStatus: Status.EI_JULKAISTU_PROJEKTIN_HENKILOT,
    pathname: `/yllapito/projekti/[oid]/henkilot`,
  },
  {
    title: "Projektin tiedot",
    requiredStatus: Status.EI_JULKAISTU,
    pathname: `/yllapito/projekti/[oid]`,
  },
  {
    title: "Käsittelyn tila",
    requiredStatus: Status.ALOITUSKUULUTUS, //TODO: avataan nyt samaan aikaan kuin aloituskuulutus lahinna esteettisista syista, ei ole speksattu tarkasti avautumista? Muutettava myohemmin, ettei sotke automaattista ohjausta (ordinal) tietyn vaiheen tayttamisen
    pathname: `/yllapito/projekti/[oid]/kasittelyntila`,
  },
  {
    title: "Aloituskuulutus",
    requiredStatus: Status.ALOITUSKUULUTUS,
    pathname: `/yllapito/projekti/[oid]/aloituskuulutus`,
  },
  {
    title: "Suunnitteluvaihe",
    requiredStatus: Status.SUUNNITTELU,
    pathname: `/yllapito/projekti/[oid]/suunnittelu`,
  },
  {
    title: "Nähtävilläolovaihe",
    requiredStatus: Status.NAHTAVILLAOLO,
    pathname: `/yllapito/projekti/[oid]/nahtavillaolo`,
  },
  {
    title: "Hyväksyminen",
    requiredStatus: Status.HYVAKSYMISMENETTELYSSA, //Avataan kun nähtävilläolovaihe on päättynyt
    pathname: `/yllapito/projekti/[oid]/hyvaksymispaatos`,
  },
];

const ProjektiSideNavigation: FC<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const router = useRouter();

  useEffect(() => {
    const requiredStatusForCurrentPath = routes.find((route) => route.pathname === router.pathname)?.requiredStatus;

    const isOnDisallowedRoute =
      !projekti.status || (requiredStatusForCurrentPath && statusOrdinal(projekti.status) < statusOrdinal(requiredStatusForCurrentPath));
    const pathnameForAllowedRoute = routes.reduce<string | undefined>((allowedPathname, route) => {
      if (projekti.status && statusOrdinal(projekti.status) >= statusOrdinal(route.requiredStatus)) {
        allowedPathname = route.pathname;
      }
      return allowedPathname;
    }, undefined);

    if (isOnDisallowedRoute && pathnameForAllowedRoute) {
      router.push({ pathname: pathnameForAllowedRoute, query: { oid: projekti.oid } });
    }
  }, [projekti, router]);

  return (
    <>
      <ProjektiKortti projekti={projekti}></ProjektiKortti>
      <div role="navigation" className={styles["side-nav"]}>
        <ul>
          {routes.map((route, index) => {
            const statusDisabled = !projekti.status || statusOrdinal(projekti.status) < statusOrdinal(route.requiredStatus);
            return (
              <li key={index}>
                <HassuLink
                  href={!statusDisabled ? { pathname: route.pathname, query: { oid: projekti.oid } } : undefined}
                  className={classNames(statusDisabled && styles.disabled, router.pathname === route.pathname && styles.selected)}
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
