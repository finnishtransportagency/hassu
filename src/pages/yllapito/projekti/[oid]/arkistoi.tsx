import { useRouter } from "next/router";
import React, { ReactElement, useEffect, useState } from "react";
import { api } from "@services/api";

export default function Arkistoi(): ReactElement {
  const [result, setResult] = useState<string>("");
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;

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
