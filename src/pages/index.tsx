import React, { useState, useEffect, useMemo, useCallback } from "react";
import { api, Kieli, ProjektiHakutulosJulkinen } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import Hakulomake from "@components/kansalaisenEtusivu/Hakulomake";
import Hakutulokset from "@components/kansalaisenEtusivu/Hakutulokset";
import log from "loglevel";
import { Grid } from "@mui/material";
import OikeaLaita from "@components/kansalaisenEtusivu/OikeaLaita";
import Sivutus from "@components/kansalaisenEtusivu/Sivutus";
import { useRouter } from "next/router";
import { SelectOption } from "@components/form/Select";
import { ProjektiTyyppi } from "../../common/graphql/apiModel";

const SIVUN_KOKO = 10;

const App = () => {
  const [hakutulos, setHakutulos] = useState<ProjektiHakutulosJulkinen>();
  const [ladataan, setLadataan] = useState<boolean>(false);
  const [kuntaOptions, setKuntaOptions] = useState<SelectOption[]>([]);

  const { t } = useTranslation();
  const router = useRouter();
  const nykyinenSivu = typeof router.query.page === "string" ? parseInt(router.query.page) : 1;

  const sivuMaara = useMemo(() => {
    return Math.ceil((hakutulos?.hakutulosMaara || 0) / SIVUN_KOKO);
  }, [hakutulos]);

  const getKuntaLista = useCallback(async () => {
    const list = await (await fetch("/api/kuntalista.json")).json();
    setKuntaOptions(list);
  }, [setKuntaOptions]);

  useEffect(() => {
    getKuntaLista();
  }, [getKuntaLista]);

  const { vapaasanahaku, kunta, maakunta, vaylamuoto } = useHaunQueryparametrit({ kuntaOptions });

  useEffect(() => {
    async function fetchProjektit() {
      try {
        setLadataan(true);
        const result = await api.listProjektitJulkinen({
          kieli: Kieli.SUOMI,
          sivunumero: Math.max(0, nykyinenSivu - 1),
          //hakusana: vapaasanahaku,
          //kunta,
          //maakunta,
          vaylamuoto: [vaylamuoto],
        });
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
  }, [setLadataan, setHakutulos, nykyinenSivu, vapaasanahaku, kunta, maakunta, vaylamuoto]);

  return (
    <Grid container spacing={0}>
      <Grid className="pr-4" item lg={9} md={12}>
        <h2 className="mt-4">{t("projekti:ui-otsikot.valtion_liikennevaylien_suunnittelu")}</h2>
        <p>Tekstiä</p>
        <Hakulomake hakutulostenMaara={hakutulos?.hakutulosMaara} kuntaOptions={kuntaOptions} />
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

type HookProps = { kuntaOptions: SelectOption[] };
type HookReturnType = {
  vapaasanahaku: string;
  kunta: string;
  maakunta: string;
  vaylamuoto: string;
  pienennaHaku: boolean;
  lisaaHakuehtoja: boolean;
};
export function useHaunQueryparametrit({ kuntaOptions }: HookProps): HookReturnType {
  const router = useRouter();
  const vapaasanahaku = typeof router.query?.vapaasanahaku === "string" ? router.query.vapaasanahaku : "";
  const kunta =
    kuntaOptions.find((option) => router.query?.kunta === option.value) && typeof router.query?.kunta === "string"
      ? router.query.kunta
      : "";
  const maakunta =
    ([] as SelectOption[]).find((option) => router.query?.maakunta === option.value) && typeof router.query?.maakunta === "string"
      ? router.query.maakunta
      : "";
  const vaylamuoto =
    Object.keys(ProjektiTyyppi).find((option) => router.query?.vaylamuoto === option) && typeof router.query?.vaylamuoto === "string"
      ? router.query.vaylamuoto
      : "";
  const pienennaHaku = router.query?.pienennahaku === "true" ? true : false;
  const lisaaHakuehtoja = router.query?.lisaahakuehtoja === "true" ? true : false;
  return {
    vapaasanahaku,
    kunta,
    maakunta,
    vaylamuoto,
    pienennaHaku,
    lisaaHakuehtoja,
  };
}
