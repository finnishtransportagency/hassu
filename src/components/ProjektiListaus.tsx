import React, { useEffect, useState } from "react";
import { api, ProjektiHakutulos, ProjektiTyyppi } from "@services/api";
import log from "loglevel";
import Table from "./Table";
import useTranslation from "next-translate/useTranslation";

type ProjektiListausProps = {
  admin?: boolean;
  projektiTyyppi: ProjektiTyyppi;
};

export default function ProjektiListaus(props: ProjektiListausProps) {
  const [hakutulos, setHakutulos] = useState<ProjektiHakutulos>();
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    async function fetchProjektit() {
      try {
        const result = await api.listPublicProjektit({ projektiTyyppi: props.projektiTyyppi });
        log.info("listProjektit:", result);
        setHakutulos(result);
      } catch (e: any) {
        log.error("Error listing projektit", e);
        if (e.errors) {
          e.errors.map((err: any) => {
            const response = err.originalError?.response;
            const httpStatus = response?.status;
            log.error("HTTP Status: " + httpStatus + "\n" + err.stack);
          });
        }
        setHakutulos({ __typename: "ProjektiHakutulos" });
      }
      setIsLoading(false);
    }
    if (props.projektiTyyppi) {
      fetchProjektit();
    }
  }, [props.projektiTyyppi]);

  return (
    <Table
      cols={[
        { header: "Nimi", data: (projekti) => projekti.nimi, fraction: 4 },
        { header: "Asiatunnus", data: (projekti) => projekti.asiatunnus, fraction: 2 },
        { header: "Projektipäällikko", data: (_) => "-", fraction: 2 },
        {
          header: "Vastuuorganisaatio",
          data: (projekti) => projekti.suunnittelustaVastaavaViranomainen,
          fraction: 2,
        },
        { header: "Vaihe", data: (projekti) => t(`projekti:projekti-status.${projekti.vaihe}`), fraction: 1 },
        { header: "Päivitetty", data: (_) => "-", fraction: 1 },
      ]}
      rows={hakutulos?.tulokset || []}
      isLoading={isLoading}
      rowLink={(projekti) =>
        (props.admin ? "/yllapito/projekti" : "/suunnitelma") + `/${encodeURIComponent(projekti.oid)}`
      }
    />
  );
}
