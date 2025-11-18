import React, { useEffect, useMemo, useState } from "react";
import { ProjektiHakutulosJulkinen } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import Hakuohje from "@components/kansalaisenEtusivu/Hakuohje";
import Hakulomake from "@components/kansalaisenEtusivu/Hakulomake";
import Hakutulokset from "@components/kansalaisenEtusivu/Hakutulokset";
import log from "loglevel";
import { Grid } from "@mui/material";
import Sivutus from "@components/kansalaisenEtusivu/Sivutus";
import { useRouter } from "next/router";
import { SelectOption } from "@components/form/Select";
import { kuntametadata } from "hassu-common/kuntametadata";
import useApi from "src/hooks/useApi";
import { langToKieli } from "../hooks/useProjektiJulkinen";
import EtusivuJulkinenSideBar from "@components/kansalaisenEtusivu/EtusivuJulkinenSideBar";
import { H1, H3 } from "@components/Headings";
import { PalauteKyselyMuistutusPopup } from "@components/projekti/kansalaisnakyma/PalauteKyselyMuistutusPopup";
import { EVKinfo } from "@components/kansalaisenEtusivu/ElinvoimakeskusInfo";

const SIVUN_KOKO = 10;

const FrontPage = () => {
  const [kuntaOptions, setKuntaOptions] = useState<SelectOption[]>([]);
  const [maakuntaOptions, setMaakuntaOptions] = useState<SelectOption[]>([]);

  const { lang } = useTranslation();

  useEffect(() => {
    setKuntaOptions(kuntametadata.kuntaOptions(lang, false));
    setMaakuntaOptions(kuntametadata.maakuntaOptions(lang, false));
  }, [lang]);

  const query = useHaunQueryparametrit({ kuntaOptions, maakuntaOptions });

  if (!query) {
    return null;
  }
  return <Etusivu query={query} maakuntaOptions={maakuntaOptions} kuntaOptions={kuntaOptions} />;
};

type Props = {
  query: HookReturnType;
  kuntaOptions: SelectOption[];
  maakuntaOptions: SelectOption[];
};

function Etusivu({ query, maakuntaOptions, kuntaOptions }: Props) {
  const { t, lang } = useTranslation("etusivu");
  const kieli = langToKieli(lang);

  const { vapaasanahaku, kunta, maakunta, vaylamuoto, sivu } = query;
  const [ladataan, setLadataan] = useState<boolean>(false);
  const [hakutulos, setHakutulos] = useState<ProjektiHakutulosJulkinen>();
  const [isInfoOpen, setIsInfoOpen] = useState(true);

  const sivuMaara = useMemo(() => Math.ceil((hakutulos?.hakutulosMaara || 0) / SIVUN_KOKO), [hakutulos]);

  const api = useApi();

  useEffect(() => {
    const isClosed = sessionStorage.getItem("infoClosed");
    if (isClosed === "true") {
      setIsInfoOpen(false);
    }
  }, []);

  const handleClose = () => {
    setIsInfoOpen(false);
    sessionStorage.setItem("infoClosed", "true");
  };

  useEffect(() => {
    async function fetchProjektit() {
      try {
        setLadataan(true);
        const result = await api.listProjektitJulkinen({
          kieli: kieli,
          sivunumero: Math.max(0, sivu - 1),
          nimi: vapaasanahaku,
          kunta: kunta ? [Number(kunta)] : undefined,
          maakunta: maakunta ? [Number(maakunta)] : undefined,
          vaylamuoto: vaylamuoto ? [vaylamuoto] : undefined,
        });
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
  }, [setLadataan, setHakutulos, sivu, vapaasanahaku, kunta, maakunta, vaylamuoto, maakuntaOptions, kuntaOptions, api, kieli]);

  return (
    <div className="flex flex-col md:flex-row gap-8 mb-3">
      <Grid container rowSpacing={4} columnSpacing={6}>
        <Grid item lg={9} md={12}>
          <H1>{t("projekti:ui-otsikot.valtion_liikennevaylien_suunnittelu")}</H1>
          <PalauteKyselyMuistutusPopup></PalauteKyselyMuistutusPopup>
          {isInfoOpen && <EVKinfo open={isInfoOpen} onClose={handleClose} />}
          <p>{t("etusivu:kappale1")}</p>
          <Hakuohje />
          <Hakulomake
            hakutulostenMaara={hakutulos?.hakutulosMaara}
            kuntaOptions={kuntaOptions}
            maakuntaOptions={maakuntaOptions}
            query={query}
          />
          <H3>{t("suunnitelmat")}</H3>
          <Hakutulokset hakutulos={hakutulos} ladataan={ladataan} />
          <Sivutus sivuMaara={sivuMaara} nykyinenSivu={sivu} />
        </Grid>
        <Grid item lg={3} md={12}>
          <EtusivuJulkinenSideBar />
        </Grid>
      </Grid>
    </div>
  );
}

export default FrontPage;

type HookProps = { kuntaOptions: SelectOption[]; maakuntaOptions: SelectOption[] };
export type HookReturnType = {
  vapaasanahaku: string;
  kunta: string;
  maakunta: string;
  vaylamuoto: string;
  sivu: number;
  pienennaHaku: boolean;
  lisaaHakuehtoja: boolean;
};

export function useHaunQueryparametrit({ kuntaOptions, maakuntaOptions }: HookProps): HookReturnType | null {
  const router = useRouter();

  return useMemo(() => {
    if (!router.isReady || kuntaOptions.length == 0 || maakuntaOptions.length == 0) {
      return null;
    }
    const vapaasanahaku = typeof router.query?.vapaasanahaku === "string" ? router.query.vapaasanahaku : "";
    const kunta =
      kuntaOptions.find((option) => router.query?.kunta === option.value) && typeof router.query?.kunta === "string"
        ? router.query.kunta
        : "";
    const maakunta =
      maakuntaOptions.find((option) => router.query?.maakunta === option.value) && typeof router.query?.maakunta === "string"
        ? router.query.maakunta
        : "";
    const vaylamuoto =
      ["tie", "rata"].find((option) => router.query?.vaylamuoto === option) && typeof router.query?.vaylamuoto === "string"
        ? router.query.vaylamuoto
        : "";
    const sivu = typeof router.query.sivu === "string" ? parseInt(router.query.sivu) : 1;
    const pienennaHaku = router.query?.pienennahaku === "true";
    const lisaaHakuehtoja = router.query?.lisaahakuehtoja === "true";
    return {
      vapaasanahaku,
      kunta,
      maakunta,
      vaylamuoto,
      sivu,
      pienennaHaku,
      lisaaHakuehtoja,
    };
  }, [
    kuntaOptions,
    maakuntaOptions,
    router.isReady,
    router.query?.kunta,
    router.query?.lisaahakuehtoja,
    router.query?.maakunta,
    router.query?.sivu,
    router.query?.pienennahaku,
    router.query?.vapaasanahaku,
    router.query?.vaylamuoto,
  ]);
}
