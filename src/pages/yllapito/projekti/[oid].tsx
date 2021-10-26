import { useRouter } from "next/router";
import React from "react";
import { api, apiConfig } from "@services/api";
import useSWR from "swr";
import PerustaProjekti from "@components/projekti/PerustaProjekti";
import log from "loglevel";

export default function ProjektiSivu() {
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
