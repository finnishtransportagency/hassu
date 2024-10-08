import { DBProjekti } from "../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { projektiAdapter } from "../projekti/adapter/projektiAdapter";
import dayjs from "dayjs";
import { parseDate } from "../util/dateUtil";
import { log } from "../logger";
import { kuntametadata } from "hassu-common/kuntametadata";
import { formatNimi } from "../util/userUtil";
import { getAsiatunnus } from "../projekti/projektiUtil";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { getVaylaUser } from "../user";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";

export type ProjektiDocument = {
  oid: string;
  nimi?: string;
  hankkeenKuvaus?: string;
  asiatunnus?: string;
  maakunnat?: number[];
  kunnat?: number[];
  vaylamuoto?: string[];
  suunnittelustaVastaavaViranomainen?: API.SuunnittelustaVastaavaViranomainen;
  vaihe?: API.Status;
  viimeinenTilaisuusPaattyy?: string;
  aktiivinen?: boolean;
  projektiTyyppi?: API.ProjektiTyyppi;
  paivitetty?: string;
  viimeisinJulkaisu?: string;
  projektipaallikko?: string;
  muokkaajat?: string[];
  publishTimestamp?: string;
  saame?: boolean;
};

export async function adaptProjektiToIndex(projekti: DBProjekti): Promise<Partial<ProjektiDocument>> {
  projekti.tallennettu = true;
  const apiProjekti = await projektiAdapter.adaptProjekti(projekti, undefined, false);
  if (!projekti.velho) {
    throw new Error("adaptProjektiToIndex: projekti.velho määrittelemättä");
  }
  const apiProjektiJulkinen = await projektiAdapterJulkinen.adaptProjekti(projekti, undefined, false);

  const viimeisinJulkaisu = apiProjektiJulkinen ? findLastPublicJulkaisuDate(apiProjektiJulkinen) : undefined;

  const partialDoc: Partial<ProjektiDocument> = {
    nimi: safeTrim(projekti.velho.nimi),
    projektiTyyppi: projekti.velho.tyyppi ?? undefined,
    suunnittelustaVastaavaViranomainen: projekti.velho.suunnittelustaVastaavaViranomainen ?? undefined,
    asiatunnus: safeTrim(getAsiatunnus(projekti.velho) ?? ""),
    maakunnat: projekti.velho.maakunnat?.map(kuntametadata.idForMaakuntaName),
    vaihe: apiProjektiJulkinen?.status ?? undefined,
    vaylamuoto: projekti.velho.vaylamuoto?.map(safeTrim),
    projektipaallikko: projekti.kayttoOikeudet
      .filter((value) => value.tyyppi == API.KayttajaTyyppi.PROJEKTIPAALLIKKO)
      .map((value) => safeTrim(formatNimi(value)))
      .pop(),
    aktiivinen: ![API.Status.EPAAKTIIVINEN_1, API.Status.EPAAKTIIVINEN_2, API.Status.EPAAKTIIVINEN_3].includes(
      apiProjekti.status as API.Status
    ),
    paivitetty: projekti.paivitetty,
    muokkaajat: projekti.kayttoOikeudet.map((value) => value.kayttajatunnus),
    viimeisinJulkaisu,
    saame: !![projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(API.Kieli.POHJOISSAAME),
  };

  return partialDoc;
}

export function adaptProjektiToJulkinenIndex(
  projekti: API.ProjektiJulkinen,
  kieli: KaannettavaKieli
): Omit<ProjektiDocument, "oid"> | undefined {
  if (!projekti) {
    return undefined;
  }

  // Use texts from published suunnitteluvaihe or aloituskuulutus
  const { nimi, hankkeenKuvaus, publishTimestamp } = getBaseDataForIndexing(projekti, kieli);

  if (!nimi) {
    return undefined;
  }

  const docWithoutOid: Omit<ProjektiDocument, "oid"> = {
    nimi: safeTrim(nimi),
    hankkeenKuvaus,
    projektiTyyppi: projekti.velho.tyyppi ?? undefined,
    kunnat: projekti.velho.kunnat?.map(kuntametadata.idForKuntaName),
    maakunnat: projekti.velho.maakunnat?.map(kuntametadata.idForMaakuntaName),
    vaihe: projekti.status ?? undefined,
    viimeinenTilaisuusPaattyy: findViimeinenTilaisuusPaattyy(projekti.vuorovaikutukset),
    vaylamuoto: projekti.velho.vaylamuoto?.map(safeTrim),
    paivitetty: projekti.paivitetty ?? undefined,
    viimeisinJulkaisu: findLastPublicJulkaisuDate(projekti),
    publishTimestamp: publishTimestamp ?? dayjs(0).format(),
    saame: !![projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(API.Kieli.POHJOISSAAME),
  };
  return docWithoutOid;
}

function getBaseDataForIndexing(
  projekti: API.ProjektiJulkinen,
  kieli: KaannettavaKieli
): Pick<ProjektiDocument, "nimi" | "hankkeenKuvaus" | "publishTimestamp"> {
  const vuorovaikutus = projekti.vuorovaikutukset;
  const aloitusKuulutusJulkaisu = projekti.aloitusKuulutusJulkaisu;
  let nimi: string | undefined;
  let hankkeenKuvaus: string | undefined;
  let publishTimestamp;
  if (projekti.vuorovaikutukset) {
    if (!projekti.kielitiedot) {
      throw new Error("adaptProjektiToJulkinenIndex: projekti.kielitiedot määrittelemättä");
    }
    // Use texts from projekti
    hankkeenKuvaus = vuorovaikutus?.hankkeenKuvaus?.[kieli] ?? undefined;
    nimi = selectNimi(projekti.velho.nimi, projekti.kielitiedot, kieli);
  } else if (aloitusKuulutusJulkaisu) {
    if (!aloitusKuulutusJulkaisu.hankkeenKuvaus) {
      throw new Error("adaptProjektiToJulkinenIndex: aloitusKuulutusJulkaisuJulkinen.hankkeenKuvaus puuttuu");
    } else if (!aloitusKuulutusJulkaisu.kielitiedot) {
      throw new Error("adaptProjektiToJulkinenIndex: aloitusKuulutusJulkaisuJulkinen.kielitiedot puuttuu");
    } else if (!aloitusKuulutusJulkaisu.kuulutusPaiva) {
      throw new Error("adaptProjektiToJulkinenIndex: aloitusKuulutusJulkaisuJulkinen.kuulutusPaiva puuttuu");
    }
    // Use texts from aloituskuulutusjulkaisu
    hankkeenKuvaus = aloitusKuulutusJulkaisu.hankkeenKuvaus[kieli] ?? undefined;
    nimi = selectNimi(aloitusKuulutusJulkaisu.velho.nimi, aloitusKuulutusJulkaisu.kielitiedot, kieli);
    publishTimestamp = parseDate(aloitusKuulutusJulkaisu.kuulutusPaiva).format();
  }
  return { nimi, hankkeenKuvaus, publishTimestamp };
}

function findViimeinenTilaisuusPaattyy(vuorovaikutus: API.VuorovaikutusJulkinen | null | undefined): string | undefined {
  return vuorovaikutus?.vuorovaikutusTilaisuudet
    ?.filter(({ paivamaara, paattymisAika }) => paivamaara && paattymisAika && dayjs(paivamaara + " " + paattymisAika).isValid())
    .map((tilaisuus) => tilaisuus.paivamaara + " " + tilaisuus.paattymisAika)
    .sort()
    .reverse()[0];
}

export function adaptSearchResultsToProjektiDocuments(results: any): ProjektiDocument[] {
  if ((results.status && results.status >= 400) || !results.hits?.hits) {
    return [];
  }
  return results.hits.hits.map((hit: any) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return { ...hit._source, oid: hit._id } as ProjektiDocument;
  });
}

export function adaptSearchResultsToProjektiHakutulosDokumenttis(results: any): API.ProjektiHakutulosDokumentti[] {
  if (results.status && results.status >= 400) {
    log.error(results);
    throw new Error("Projektihaussa tapahtui virhe");
  }
  return results.hits?.hits?.map(mapProjektiDocumentHitToHakutulosDokumentti) ?? [];
}

function safeTrim(s: string): string {
  return s.trim();
}

function selectNimi(nimi: string | null | undefined, kielitiedot: API.Kielitiedot, kieli: API.Kieli): string | undefined {
  if (nimi && (kielitiedot.ensisijainenKieli == kieli || kielitiedot.toissijainenKieli == kieli)) {
    if (kieli == API.Kieli.SUOMI) {
      return nimi;
    } else {
      return kielitiedot.projektinNimiVieraskielella ?? undefined;
    }
  }
}

type JulkaisuDateFetcher = (projekti: API.ProjektiJulkinen) => string | undefined | null;

// Ei julkisilla vaiheilla undefined
const julkaisuDateForStatus: Record<API.Status, JulkaisuDateFetcher> = {
  EI_JULKAISTU: () => undefined,
  EI_JULKAISTU_PROJEKTIN_HENKILOT: () => undefined,
  ALOITUSKUULUTUS: (projekti) => projekti.aloitusKuulutusJulkaisu?.kuulutusPaiva,
  SUUNNITTELU: (projekti) => projekti.vuorovaikutukset?.vuorovaikutusJulkaisuPaiva,
  NAHTAVILLAOLO_AINEISTOT: () => undefined,
  NAHTAVILLAOLO: (projekti) => projekti.nahtavillaoloVaihe?.kuulutusPaiva,
  HYVAKSYMISMENETTELYSSA: (projekti) => projekti.nahtavillaoloVaihe?.kuulutusPaiva,
  HYVAKSYMISMENETTELYSSA_AINEISTOT: () => undefined,
  HYVAKSYTTY: (projekti) => projekti.hyvaksymisPaatosVaihe?.kuulutusPaiva,
  EPAAKTIIVINEN_1: (projekti) => projekti.hyvaksymisPaatosVaihe?.kuulutusPaiva,
  JATKOPAATOS_1_HYVAKSYMISESITYS: () => undefined,
  JATKOPAATOS_1_AINEISTOT: () => undefined,
  JATKOPAATOS_1: (projekti) => projekti.jatkoPaatos1Vaihe?.kuulutusPaiva,
  EPAAKTIIVINEN_2: (projekti) => projekti.jatkoPaatos1Vaihe?.kuulutusPaiva,
  JATKOPAATOS_2_HYVAKSYMISESITYS: () => undefined,
  JATKOPAATOS_2_AINEISTOT: () => undefined,
  JATKOPAATOS_2: (projekti) => projekti.jatkoPaatos2Vaihe?.kuulutusPaiva,
  EPAAKTIIVINEN_3: (projekti) => projekti.jatkoPaatos2Vaihe?.kuulutusPaiva,
};

function findLastPublicJulkaisuDate(projekti: API.ProjektiJulkinen): string | undefined {
  if (!projekti.status) {
    return undefined;
  }
  return julkaisuDateForStatus[projekti.status](projekti) ?? undefined;
}

function getOikeusMuokata(muokkaajat: string[] | undefined) {
  const user = getVaylaUser();
  if (!user?.uid) {
    return false;
  }

  const userIsMuokkaja = [...(muokkaajat ?? [])].includes(user.uid);
  const userIsAdmin = !!user?.roolit?.includes("hassu_admin");

  return userIsMuokkaja || userIsAdmin;
}

export type ProjektiDocumentHit = {
  _id: ProjektiDocument["oid"];
  _source: Omit<ProjektiDocument, "oid">;
};

function mapProjektiDocumentHitToHakutulosDokumentti(hit: ProjektiDocumentHit) {
  const {
    projektipaallikko,
    muokkaajat,
    asiatunnus,
    hankkeenKuvaus,
    kunnat,
    maakunnat,
    nimi,
    paivitetty,
    projektiTyyppi,
    saame,
    suunnittelustaVastaavaViranomainen,
    vaihe,
    vaylamuoto,
    viimeinenTilaisuusPaattyy,
    viimeisinJulkaisu,
  } = hit._source;

  const oikeusMuokata = getOikeusMuokata(muokkaajat);

  const dokumentti: API.ProjektiHakutulosDokumentti = {
    oid: hit._id,
    __typename: "ProjektiHakutulosDokumentti",
    asiatunnus,
    hankkeenKuvaus,
    kunnat,
    maakunnat,
    nimi,
    paivitetty,
    projektipaallikko,
    projektiTyyppi,
    saame,
    suunnittelustaVastaavaViranomainen,
    vaihe,
    vaylamuoto,
    viimeinenTilaisuusPaattyy,
    oikeusMuokata,
    viimeisinJulkaisu,
    asiatunnusELY: null,
    asiatunnusVayla: null,
  };
  return dokumentti;
}
