import React, { ReactElement } from "react";
import HassuLink from "../HassuLink";
import styles from "@styles/projekti/ProjektiSideNavigation.module.css";
import classNames from "classnames";
import { useRouter } from "next/router";
import useProjekti from "src/hooks/useProjekti";
import { Status } from "@services/api";
import ProjektiKortti from "./ProjektiKortti";

interface Route {
  title: string;
  status: Status;
  href?: string;
  disabled?: boolean;
}

function statusOrdinal(status: Status): number {
  return Object.values(Status).indexOf(status);
}

export default function ProjektiSideNavigation(): ReactElement {
  const router = useRouter();
  const oidParam = router.query.oid;
  const { data: projekti } = useProjekti(oidParam as string);
  const oid = projekti?.oid;

  const routes: Route[] = [
    {
      title: "Projektin henkilöt",
      status: Status.EI_JULKAISTU_PROJEKTIN_HENKILOT,
      href: oid && `/yllapito/projekti/${oid}/henkilot`,
      disabled: !projekti?.tallennettu,
    },
    {
      title: "Projektin tiedot",
      status: Status.EI_JULKAISTU,
      href: oid && `/yllapito/projekti/${oid}`,
      disabled: !projekti?.tallennettu,
    },
    {
      title: "Aloituskuulutus",
      status: Status.ALOITUSKUULUTUS,
      href: oid && `/yllapito/projekti/${oid}/aloituskuulutus`,
      disabled: !projekti?.status || projekti?.status === Status.EI_JULKAISTU,
    },
    {
      title: "Suunnitteluvaihe",
      status: Status.SUUNNITTELU,
      href: oid && `/yllapito/projekti/${oid}/suunnittelu`,
      disabled: !projekti?.status || !projekti?.aloitusKuulutusJulkaisut,
    },
    {
      title: "Nähtävilläolovaihe",
      status: Status.NAHTAVILLAOLO,
      href: oid && `/yllapito/projekti/${oid}/nahtavillaolo`,
      disabled: !projekti?.status || !projekti?.suunnitteluVaihe || !projekti.suunnitteluVaihe.julkinen,
    },
  ];

  // Use router.asPath to find out which step is open in browser
  let currentRoute = routes.filter((route) => router.asPath === route.href).pop();
  if (!currentRoute) {
    if (routes[0].href) {
      router.push(routes[0].href);
      return <></>;
    }
  } else {
    const currentStepNumber = statusOrdinal(currentRoute.status);

    if (projekti && projekti.status) {
      const projektiStepNumber = statusOrdinal(projekti.status);

      // Disable steps that are not allowed by the current projekti.status
      routes.forEach((route) => {
        const routeStepNumber = statusOrdinal(route.status);
        if (routeStepNumber > projektiStepNumber) {
          route.disabled = true;
        }
      });

      // Verify that current page is among the allowed states and that there are no earlier states missing data.
      // Redirect user to fill the data in the missing steps
      if (projektiStepNumber < currentStepNumber) {
        let currentProjektiRoute = routes.filter((route) => route.status == projekti.status).pop();
        if (currentProjektiRoute?.href) {
          router.push(currentProjektiRoute.href);
        }
      }
    }
  }

  if (!projekti) {
    return <></>;
  }
  
  return (
    <>
      <ProjektiKortti projekti={projekti}></ProjektiKortti>

      <div role="navigation" className={styles["side-nav"]}>
        <ul>
          {routes.map((route, index) => (
            <li key={index}>
              <HassuLink
                href={!route.disabled ? route.href : undefined}
                className={classNames(
                  route.disabled && styles.disabled,
                  router.asPath === route.href && styles.selected
                )}
              >
                {route.title}
              </HassuLink>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
