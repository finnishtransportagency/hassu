import { apiConfig } from "common/abstractApi";
import { useRouter } from "next/router";
import React, { ReactElement } from "react";
import useApi from "src/hooks/useApi";
import useSWR from "swr";

export default function Arkistoi(): ReactElement {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const api = useApi();
  const { data } = useSWR([apiConfig.arkistoiProjekti.graphql], async () => {
    try {
      if (oid) {
        await api.arkistoiProjekti(oid);
      }
      return oid ? "Arkistoinnin tulos: Projekti " + oid + " arkistoitu" : "Arkistoinnin tulos: Projektin oid puuttuu";
    } catch (e) {
      return "Arkistoinnin tulos: " + (e instanceof Error ? e.message : e);
    }
  });
  return <p id="result">{data ?? "Arkistointi menossa..."}</p>;
}
