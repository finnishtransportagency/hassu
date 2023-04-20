import { DBProjekti } from "../database/model";
import * as API from "../../../common/graphql/apiModel";
import { projektiAdapter } from "../projekti/adapter/projektiAdapter";
import dayjs from "dayjs";
import { parseDate } from "../util/dateUtil";
import { log } from "../logger";
import { kuntametadata } from "../../../common/kuntametadata";
import { formatNimi } from "../util/userUtil";
import { getAsiatunnus } from "../projekti/projektiUtil";
import { KaannettavaKieli } from "../../../common/kaannettavatKielet";

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
  projektipaallikko?: string;
  muokkaajat?: string[];
  publishTimestamp?: string;
  saame?: boolean;
};

export function adaptProjektiToIndex(projekti: DBProjekti): Partial<ProjektiDocument> {
  projekti.tallennettu = true;
  const apiProjekti = projektiAdapter.adaptProjekti(projekti);
  if (!projekti.velho) {
    throw new Error("adaptProjektiToIndex: projekti.velho määrittelemättä");
  }
  const partialDoc: Partial<ProjektiDocument> = {
    nimi: safeTrim(projekti.velho.nimi),
    projektiTyyppi: projekti.velho.tyyppi || undefined,
    suunnittelustaVastaavaViranomainen: projekti.velho.suunnittelustaVastaavaViranomainen || undefined,
    asiatunnus: safeTrim(getAsiatunnus(projekti.velho) || ""),
    maakunnat: projekti.velho.maakunnat?.map(kuntametadata.idForMaakuntaName),
    vaihe: apiProjekti.status || undefined,
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
    saame: !![projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(API.Kieli.POHJOISSAAME),
  };

  return partialDoc;
}

export function adaptProjektiToJulkinenIndex(
  projekti: API.ProjektiJulkinen,
  kieli: KaannettavaKieli
): Omit<ProjektiDocument, "oid"> | undefined {
  if (projekti) {
    // Use texts from suunnitteluvaihe or from published aloituskuulutus
    const vuorovaikutus = projekti.vuorovaikutukset;
    const aloitusKuulutusJulkaisuJulkinen = projekti.aloitusKuulutusJulkaisu;
    let nimi: string | undefined;
    let hankkeenKuvaus: string | undefined;
    let publishTimestamp;
    if (vuorovaikutus) {
      if (!projekti.kielitiedot) {
        throw new Error("adaptProjektiToJulkinenIndex: projekti.kielitiedot määrittelemättä");
      }
      // Use texts from projekti
      hankkeenKuvaus = vuorovaikutus?.hankkeenKuvaus?.[kieli] || undefined;
      nimi = selectNimi(projekti.velho.nimi, projekti.kielitiedot, kieli);
    } else if (aloitusKuulutusJulkaisuJulkinen) {
      if (!aloitusKuulutusJulkaisuJulkinen.hankkeenKuvaus) {
        throw new Error("adaptProjektiToJulkinenIndex: aloitusKuulutusJulkaisuJulkinen.hankkeenKuvaus puuttuu");
      }
      if (!aloitusKuulutusJulkaisuJulkinen.kielitiedot) {
        throw new Error("adaptProjektiToJulkinenIndex: aloitusKuulutusJulkaisuJulkinen.kielitiedot puuttuu");
      }
      if (!aloitusKuulutusJulkaisuJulkinen.kuulutusPaiva) {
        throw new Error("adaptProjektiToJulkinenIndex: aloitusKuulutusJulkaisuJulkinen.kuulutusPaiva puuttuu");
      }
      // Use texts from aloituskuulutusjulkaisu
      hankkeenKuvaus = aloitusKuulutusJulkaisuJulkinen.hankkeenKuvaus[kieli] || undefined;
      nimi = selectNimi(aloitusKuulutusJulkaisuJulkinen.velho.nimi, aloitusKuulutusJulkaisuJulkinen.kielitiedot, kieli);
      publishTimestamp = parseDate(aloitusKuulutusJulkaisuJulkinen.kuulutusPaiva).format();
    }

    if (!nimi) {
      return undefined;
    }

    if (!publishTimestamp) {
      publishTimestamp = dayjs(0).format();
    }

    let viimeinenTilaisuusPaattyyString: string | undefined;
    let viimeinenTilaisuusPaattyyNumber: number | undefined;

    if (vuorovaikutus) {
      vuorovaikutus?.vuorovaikutusTilaisuudet?.forEach((tilaisuus) => {
        if (tilaisuus.paivamaara && tilaisuus.paattymisAika) {
          const tilaisuusPaattyyNumber = Date.parse(tilaisuus.paivamaara + " " + tilaisuus.paattymisAika);

          if (tilaisuusPaattyyNumber && (!viimeinenTilaisuusPaattyyNumber || tilaisuusPaattyyNumber > viimeinenTilaisuusPaattyyNumber)) {
            viimeinenTilaisuusPaattyyString = tilaisuus.paivamaara + " " + tilaisuus.paattymisAika;
            viimeinenTilaisuusPaattyyNumber = tilaisuusPaattyyNumber;
          }
        }
      });
    }

    const docWithoutOid: Omit<ProjektiDocument, "oid"> = {
      nimi: safeTrim(nimi),
      hankkeenKuvaus,
      projektiTyyppi: projekti.velho.tyyppi || undefined,
      kunnat: projekti.velho.kunnat?.map(kuntametadata.idForKuntaName),
      maakunnat: projekti.velho.maakunnat?.map(kuntametadata.idForMaakuntaName),
      vaihe: projekti.status || undefined,
      viimeinenTilaisuusPaattyy: viimeinenTilaisuusPaattyyString,
      vaylamuoto: projekti.velho.vaylamuoto?.map(safeTrim),
      paivitetty: projekti.paivitetty || undefined,
      publishTimestamp,
      saame: !![projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(API.Kieli.POHJOISSAAME),
    };
    return docWithoutOid;
  }
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
  return (
    results.hits?.hits?.map((hit: any) => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return { ...hit._source, oid: hit._id, __typename: "ProjektiHakutulosDokumentti" } as API.ProjektiHakutulosDokumentti;
    }) || []
  );
}

function safeTrim(s: string): string {
  return s.trim();
}

function selectNimi(nimi: string | null | undefined, kielitiedot: API.Kielitiedot, kieli: API.Kieli): string | undefined {
  if (nimi && (kielitiedot.ensisijainenKieli == kieli || kielitiedot.toissijainenKieli == kieli)) {
    if (kieli == API.Kieli.SUOMI) {
      return nimi || undefined;
    } else {
      return kielitiedot.projektinNimiVieraskielella || undefined;
    }
  }
}
