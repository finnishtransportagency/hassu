import { DBProjekti, Kielitiedot } from "../database/model";
import {
  Kieli,
  ProjektiHakutulosDokumentti,
  ProjektiJulkinen,
  ProjektiRooli,
  ProjektiTyyppi,
  Status,
  Viranomainen,
} from "../../../common/graphql/apiModel";
import { projektiAdapter } from "../handler/projektiAdapter";
import dayjs from "dayjs";
import { parseDate } from "../util/dateUtil";
import { log } from "../logger";

export type ProjektiDocument = {
  oid: string;
  nimi?: string;
  hankkeenKuvaus?: string;
  asiatunnus?: string;
  maakunnat?: string[];
  kunnat?: string[];
  vaylamuoto?: string[];
  suunnittelustaVastaavaViranomainen?: Viranomainen;
  vaihe?: Status;
  projektiTyyppi?: ProjektiTyyppi;
  paivitetty?: string;
  projektipaallikko?: string;
  muokkaajat?: string[];
  publishTimestamp?: string;
};

export function adaptProjektiToIndex(projekti: DBProjekti): Partial<ProjektiDocument> {
  projekti.tallennettu = true;
  const apiProjekti = projektiAdapter.adaptProjekti(projekti);

  return {
    nimi: safeTrim(projekti.velho.nimi),
    asiatunnus: safeTrim(projekti.velho.asiatunnusELY || projekti.velho.asiatunnusVayla || ""),
    projektiTyyppi: projekti.velho.tyyppi,
    suunnittelustaVastaavaViranomainen: projekti.velho.suunnittelustaVastaavaViranomainen,
    maakunnat: projekti.velho.maakunnat?.map(safeTrim),
    vaihe: apiProjekti.status,
    vaylamuoto: projekti.velho.vaylamuoto?.map(safeTrim),
    projektipaallikko: projekti.kayttoOikeudet
      .filter((value) => value.rooli == ProjektiRooli.PROJEKTIPAALLIKKO)
      .map((value) => safeTrim(value.nimi))
      .pop(),
    paivitetty: projekti.paivitetty || dayjs().format(),
    muokkaajat: projekti.kayttoOikeudet.map((value) => value.kayttajatunnus),
  } as Partial<ProjektiDocument>;
}

export function adaptProjektiToJulkinenIndex(
  projekti: ProjektiJulkinen,
  kieli: Kieli
): Omit<ProjektiDocument, "oid"> | undefined {
  if (projekti) {
    // Use texts from suunnitteluvaihe or from published aloituskuulutus
    const suunnitteluVaihe = projekti.suunnitteluVaihe;
    const aloitusKuulutusJulkaisuJulkinen = projekti.aloitusKuulutusJulkaisut?.[0];
    let nimi: string;
    let hankkeenKuvaus: string | undefined;
    let publishTimestamp;
    if (suunnitteluVaihe) {
      // Use texts from projekti
      hankkeenKuvaus = suunnitteluVaihe?.hankkeenKuvaus?.[kieli];
      nimi = selectNimi(projekti.velho.nimi, projekti.kielitiedot, kieli);
    } else if (aloitusKuulutusJulkaisuJulkinen) {
      // Use texts from aloituskuulutusjulkaisu
      hankkeenKuvaus = aloitusKuulutusJulkaisuJulkinen.hankkeenKuvaus?.[kieli];
      nimi = selectNimi(aloitusKuulutusJulkaisuJulkinen.velho.nimi, aloitusKuulutusJulkaisuJulkinen.kielitiedot, kieli);
      publishTimestamp = parseDate(aloitusKuulutusJulkaisuJulkinen.kuulutusPaiva).format();
    }

    if (!nimi) {
      return undefined;
    }

    if (!publishTimestamp) {
      publishTimestamp = dayjs(0).format();
    }

    return {
      nimi: safeTrim(nimi),
      hankkeenKuvaus,
      projektiTyyppi: projekti.velho.tyyppi,
      kunnat: projekti.velho.kunnat?.map(safeTrim),
      maakunnat: projekti.velho.maakunnat?.map(safeTrim),
      vaihe: projekti.status,
      vaylamuoto: projekti.velho.vaylamuoto?.map(safeTrim),
      paivitetty: projekti.paivitetty || dayjs().format(),
      publishTimestamp,
    } as Omit<ProjektiDocument, "oid">;
  }
}

export function adaptSearchResultsToProjektiDocuments(results: any): ProjektiDocument[] {
  if ((results.status && results.status >= 400) || !results.hits?.hits) {
    return [];
  }
  return results.hits.hits.map((hit: any) => {
    return { ...hit._source, oid: hit._id } as ProjektiDocument;
  });
}

export function adaptSearchResultsToProjektiHakutulosDokumenttis(results: any): ProjektiHakutulosDokumentti[] {
  if (results.status && results.status >= 400) {
    log.error(results);
    throw new Error("Projektihaussa tapahtui virhe");
  }
  return (
    results.hits?.hits?.map((hit: any) => {
      return { ...hit._source, oid: hit._id, __typename: "ProjektiHakutulosDokumentti" } as ProjektiHakutulosDokumentti;
    }) || []
  );
}

function safeTrim(s: string): string | unknown {
  if (s) {
    return s.trim();
  }
}

function selectNimi(nimi: string, kielitiedot: Kielitiedot, kieli: Kieli): string {
  if (kielitiedot.ensisijainenKieli == kieli || kielitiedot.toissijainenKieli == kieli) {
    if (kieli == Kieli.SUOMI) {
      return nimi;
    } else {
      return kielitiedot.projektinNimiVieraskielella;
    }
  }
}
