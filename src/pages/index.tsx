import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { MaakuntaListaOption } from "./api/maakuntalista.json";
import { KuntaListaOption } from "./api/kuntalista.json";

function jarjestaOptionit(a: SelectOption, b: SelectOption) {
  if (!a.label) {
    return 1;
  } else if (!b.label) {
    return 0;
  }
  return a.label.localeCompare(b.label);
}

const SIVUN_KOKO = 10;

const App = () => {
  const [kuntaOptions, setKuntaOptions] = useState<SelectOption[]>([]);
  const [maakuntaOptions, setMaakuntaOptions] = useState<SelectOption[]>([]);

  const { lang } = useTranslation();

  const getKuntaLista = useCallback(
    async (lang: string) => {
      const list: KuntaListaOption[] = await (await fetch("/api/kuntalista.json")).json();
      if (lang === "sv") {
        setKuntaOptions(list.map((option) => ({ ...option, label: option.labelRuo })).sort(jarjestaOptionit));
      } else {
        setKuntaOptions(list);
      }
    },
    [setKuntaOptions]
  );

  const getMaakuntaLista = useCallback(
    async (lang: string) => {
      const list: MaakuntaListaOption[] = await (await fetch("/api/maakuntalista.json")).json();
      if (lang === "sv") {
        setMaakuntaOptions(list.map((option) => ({ ...option, label: option.labelRuo })).sort(jarjestaOptionit));
      } else {
        setMaakuntaOptions(list);
      }
    },
    [setMaakuntaOptions]
  );

  useEffect(() => {
    getKuntaLista(lang);
    getMaakuntaLista(lang);
  }, [getKuntaLista, getMaakuntaLista, lang]);

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
  const { t } = useTranslation();

  const { vapaasanahaku, kunta, maakunta, vaylamuoto, sivu } = query;
  const [ladataan, setLadataan] = useState<boolean>(false);
  const [hakutulos, setHakutulos] = useState<ProjektiHakutulosJulkinen>();

  const sivuMaara = useMemo(() => {
    return Math.ceil((hakutulos?.hakutulosMaara || 0) / SIVUN_KOKO);
  }, [hakutulos]);

  useEffect(() => {
    async function fetchProjektit() {
      try {
        setLadataan(true);
        const result = await api.listProjektitJulkinen({
          kieli: Kieli.SUOMI,
          sivunumero: Math.max(0, sivu - 1),
          nimi: vapaasanahaku,
          kunta: keywordToKey(kunta, kuntaOptions),
          maakunta: keywordToKey(maakunta, maakuntaOptions),
          vaylamuoto: vaylamuoto ? [vaylamuoto] : undefined,
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
  }, [setLadataan, setHakutulos, sivu, vapaasanahaku, kunta, maakunta, vaylamuoto, maakuntaOptions, kuntaOptions]);

  return (
    <Grid container rowSpacing={4} columnSpacing={4}>
      <Grid item lg={9} md={12}>
        <h2 className="mt-4">{t("projekti:ui-otsikot.valtion_liikennevaylien_suunnittelu")}</h2>
        <p>Tekstiä</p>
        <Hakulomake
          hakutulostenMaara={hakutulos?.hakutulosMaara}
          kuntaOptions={kuntaOptions}
          maakuntaOptions={maakuntaOptions}
          query={query}
        />
        <h1>Suunnitelmat</h1>
        <Hakutulokset hakutulos={hakutulos} ladataan={ladataan} />
        <Sivutus sivuMaara={sivuMaara} nykyinenSivu={sivu} />
      </Grid>
      <Grid item lg={3} md={12}>
        <OikeaLaita />
      </Grid>
    </Grid>
  );
}

export default App;

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
    const pienennaHaku = router.query?.pienennahaku === "true" ? true : false;
    const lisaaHakuehtoja = router.query?.lisaahakuehtoja === "true" ? true : false;
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

function keywordToKey(keyword: string, options: SelectOption[]) : string[] | undefined{
  if (! keyword) return undefined;
  const label = options.find((option) => keyword === option.value)?.label;
  return label ? [label] : undefined;
}
