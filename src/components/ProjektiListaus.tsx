import React, { useEffect, useMemo, useState } from "react";
import { Kieli, ProjektiHakutulosDokumentti, ProjektiHakutulosJulkinen } from "@services/api";
import log from "loglevel";
import HassuTable from "./HassuTable";
import useTranslation from "next-translate/useTranslation";
import { formatDate } from "src/util/dateUtils";
import { useHassuTable } from "src/hooks/useHassuTable";
import { Column } from "react-table";
import useApi from "src/hooks/useApi";

export default function ProjektiListaus() {
  const api = useApi();
  const [hakutulos, setHakutulos] = useState<ProjektiHakutulosJulkinen>();
  const { t } = useTranslation();

  useEffect(() => {
    async function fetchProjektit() {
      try {
        const result = await api.listProjektitJulkinen({ kieli: Kieli.SUOMI });
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
        setHakutulos({ __typename: "ProjektiHakutulosJulkinen" });
      }
    }

    fetchProjektit();
  }, [api]);

  const columns = useMemo<Column<ProjektiHakutulosDokumentti>[]>(
    () => [
      { Header: t("projekti:ui-otsikot.nimi") as string, accessor: "nimi" },
      { Header: t("projekti:ui-otsikot.asiatunnus") as string, accessor: "asiatunnus" },
      { Header: t("projekti:ui-otsikot.projektipaallikko") as string, accessor: "projektipaallikko" },
      {
        Header: t("projekti:ui-otsikot.vastuuorganisaatio") as string,
        accessor: (projekti) =>
          projekti.suunnittelustaVastaavaViranomainen && t(`projekti:vastaava-viranomainen.${projekti.suunnittelustaVastaavaViranomainen}`),
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
    [t]
  );

  const tableProps = useHassuTable<ProjektiHakutulosDokumentti>({
    tableOptions: {
      columns,
      initialState: { hiddenColumns: ["oid"] },
      data: hakutulos?.tulokset || [],
    },
    rowLink: (projekti) => `/suunnitelma/${encodeURIComponent(projekti.oid)}/aloituskuulutus`,
  });

  return (
    <>
      <HassuTable {...tableProps} />
    </>
  );
}
