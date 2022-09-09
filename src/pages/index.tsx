import React, { useState, useEffect, useMemo } from "react";
import { api, Kieli, ProjektiHakutulosJulkinen } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import Hakulomake from "@components/kansalaisenEtusivu/Hakulomake";
import Hakutulokset from "@components/kansalaisenEtusivu/Hakutulokset";
import log from "loglevel";
import { Grid } from "@mui/material";
import OikeaLaita from "@components/kansalaisenEtusivu/OikeaLaita";
import Sivutus from "@components/kansalaisenEtusivu/Sivutus";
import { useRouter } from "next/router";
const SIVUN_KOKO = 10;

const App = () => {
  const [hakutulos, setHakutulos] = useState<ProjektiHakutulosJulkinen>();
  const [ladataan, setLadataan] = useState<boolean>(false);
  const { t } = useTranslation();
  const router = useRouter();
  const nykyinenSivu = typeof router.query.page === "string" ? parseInt(router.query.page) : 1;

  const sivuMaara = useMemo(() => {
    return Math.ceil((hakutulos?.hakutulosMaara || 0) / SIVUN_KOKO);
  }, [hakutulos]);

  useEffect(() => {
    async function fetchProjektit() {
      try {
        setLadataan(true);
        const result = await api.listProjektitJulkinen({ kieli: Kieli.SUOMI, sivunumero: Math.max(0, nykyinenSivu - 1) });
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
  }, [setLadataan, setHakutulos, nykyinenSivu]);

  return (
    <Grid container spacing={0}>
      <Grid className="pr-4" item lg={9} md={12}>
        <h2 className="mt-4">{t("projekti:ui-otsikot.valtion_liikennevaylien_suunnittelu")}</h2>
        <p>Tekstiä</p>
        <Hakulomake hakutulostenMaara={hakutulos?.hakutulosMaara} />
        <h1>Suunnitelmat</h1>
        <Hakutulokset hakutulos={hakutulos} ladataan={ladataan} />
        <Sivutus sivuMaara={sivuMaara} />
      </Grid>
      <Grid item lg={3} md={12}>
        <OikeaLaita />
      </Grid>
    </Grid>
  );
};

export default App;
