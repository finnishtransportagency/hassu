import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { api, apiConfig } from "@services/api";
import useSWR from "swr";
import PerustaProjekti from "@components/projekti/PerustaProjekti";
import log from "loglevel";
import { PageProps } from "@pages/_app";

export default function ProjektiSivu({ setRouteLabels }: PageProps) {
  const router = useRouter();
  const oid = router.query.oid;
  const {
    data: projekti,
    error: projektiLoadError,
    mutate,
  } = useSWR([apiConfig.lataaProjekti.graphql, oid], projektiLoader);
  const isLoadingProjekti = !projekti && !projektiLoadError;

  const reloadProject = () => {
    mutate();
  };

  useEffect(() => {
    if (router.isReady) {
      let routeLabel = "";
      if (projekti?.nimi) {
        routeLabel = projekti.nimi;
      } else if (typeof oid === "string") {
        routeLabel = oid;
      }
      if (routeLabel) {
        setRouteLabels({ "/yllapito/projekti/[oid]": { label: routeLabel } });
      }
    }
  }, [router.isReady, oid, projekti]);

  if (isLoadingProjekti) {
    return <p>Ladataan projektia...</p>;
  } else if (!projekti || projektiLoadError) {
    log.log(projektiLoadError);
    return <p>Projektin latauksessa tapahtui virhe.</p>;
  } else if (projekti.tallennettu) {
    return (
      <>
        <p>PROJEKTIN MUOKKAUS SIVU - TBD</p>
        <p>{projekti.nimi}</p>
      </>
    );
  } else {
    return <PerustaProjekti projekti={projekti} reloadProject={reloadProject} />;
  }
}

async function projektiLoader(_: string, oid: string) {
  if (!oid) {
    return null;
  }
  return await api.lataaProjekti(oid);
}
