import React, { useEffect, useState } from "react";
import { api, ProjektiHakutulos, ProjektiHakutulosDokumentti, ProjektiTyyppi } from "@services/api";
import log from "loglevel";
import Table from "./Table";
import useTranslation from "next-translate/useTranslation";
import { formatDate } from "src/util/dateUtils";

type ProjektiListausProps = {
  projektiTyyppi: ProjektiTyyppi;
};

export default function ProjektiListaus(props: ProjektiListausProps) {
  const [hakutulos, setHakutulos] = useState<ProjektiHakutulos>();
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
    }
    if (props.projektiTyyppi) {
      fetchProjektit();
    }
  }, [props.projektiTyyppi]);

  return (
    <>
      <Table<ProjektiHakutulosDokumentti>
        tableOptions={{
          columns: [
            { Header: t("projekti:ui-otsikot.nimi") as string, accessor: "nimi" },
            { Header: t("projekti:ui-otsikot.asiatunnus") as string, accessor: "asiatunnus" },
            { Header: t("projekti:ui-otsikot.projektipaallikko") as string, accessor: "projektipaallikko" },
            {
              Header: t("projekti:ui-otsikot.vastuuorganisaatio") as string,
              accessor: (projekti) =>
                projekti.suunnittelustaVastaavaViranomainen &&
                t(`projekti:vastaava-viranomainen.${projekti.suunnittelustaVastaavaViranomainen}`),
            },
            {
              Header: t("projekti:ui-otsikot.vaihe") as string,
              accessor: (projekti) => projekti.vaihe && t(`projekti:projekti-status.${projekti.vaihe}`),
            },
            {
              Header: t("projekti:ui-otsikot.paivitetty") as string,
              accessor: (projekti) => projekti.paivitetty && formatDate(projekti.paivitetty),
            },
            { Header: t("projekti:ui-otsikot.oid") as string, accessor: "oid" },
          ],
          initialState: { hiddenColumns: ["oid"] },
          data: hakutulos?.tulokset || [],
        }}
        rowLink={(projekti) => `/suunnitelma/${encodeURIComponent(projekti.oid)}`}
      />
    </>
  );
}
