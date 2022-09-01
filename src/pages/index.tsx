import React, { useState, useEffect } from "react";
import { api, Kieli, ProjektiHakutulosJulkinen } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import Hakulomake from "@components/kansalaisenEtusivu/Hakulomake";
import Hakutulokset from "@components/kansalaisenEtusivu/Hakutulokset";
import log from "loglevel";
import HassuGrid from "@components/HassuGrid";
import HassuGridItem from "@components/HassuGridItem";
import OikeaLaita from "@components/kansalaisenEtusivu/OikeaLaita";

const App = () => {
  const [hakutulos, setHakutulos] = useState<ProjektiHakutulosJulkinen>();
  const [ladataan, setLadataan] = useState<boolean>(false);
  const { t } = useTranslation();

  // Tässä jossain kohtaan luetaan URL:n query parametreista dataa

  useEffect(() => {
    async function fetchProjektit() {
      try {
        setLadataan(true);
        const result = await api.listProjektitJulkinen({ kieli: Kieli.SUOMI });
        log.info("listProjektit:", result);
        setHakutulos(result);
        setLadataan(false);
      } catch (e: any) {
        setLadataan(false);
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
  }, [setLadataan, setHakutulos]);

  return (
    <HassuGrid cols={{ lg: 4 }}>
      <HassuGridItem colSpan={{ lg: 3 }}>
        <h2 className="mt-4">{t("common:valtion_liikennevaylien_suunnittelu")}</h2>
        <p>Tekstiä</p>
        <Hakulomake /> {/* TODO/Toteuta: Insertoidaan hakulomakkeelle sen lähtöarvot */}
        <Hakutulokset hakutulos={hakutulos} ladataan={ladataan} />
      </HassuGridItem>
      <HassuGridItem>
        <OikeaLaita />
      </HassuGridItem>
    </HassuGrid>
  );
};

export default App;
