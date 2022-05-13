import { useRouter } from "next/router";
import React, { ReactElement, useEffect, useState } from "react";
import { api } from "@services/api";
import { PageProps } from "@pages/_app";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";

export default function Arkistoi({ setRouteLabels }: PageProps): ReactElement {
  const [result, setResult] = useState<string>("");
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;

  useProjektiBreadcrumbs(setRouteLabels);
  
  useEffect(() => {
    if (oid) {
      api
        .arkistoiProjekti(oid)
        .then(() => {
          setResult("Arkistoinnin tulos: Projekti " + oid + " arkistoitu");
        })
        .catch((e) => {
          setResult("Arkistoinnin tulos: " + e.message);
        });
    }
  }, [oid]);
  return <p id="result">{result}</p>;
}
