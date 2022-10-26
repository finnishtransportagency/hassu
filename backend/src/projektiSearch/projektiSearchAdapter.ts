import { DBProjekti } from "../database/model";
import * as API from "../../../common/graphql/apiModel";
import { projektiAdapter } from "../projekti/adapter/projektiAdapter";
import dayjs from "dayjs";
import { parseDate } from "../util/dateUtil";
import { log } from "../logger";
import { kuntametadata } from "../../../common/kuntametadata";

export type ProjektiDocument = {
  oid: string;
  nimi?: string;
  hankkeenKuvaus?: string;
  asiatunnus?: string;
  maakunnat?: number[];
  kunnat?: number[];
  vaylamuoto?: string[];
  suunnittelustaVastaavaViranomainen?: API.Viranomainen;
  vaihe?: API.Status;
  viimeinenTilaisuusPaattyy?: string;
  projektiTyyppi?: API.ProjektiTyyppi;
  paivitetty?: string;
  projektipaallikko?: string;
  muokkaajat?: string[];
  publishTimestamp?: string;
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
    asiatunnus: safeTrim(getAsiatunnus(projekti) || ""),
    maakunnat: projekti.velho.maakunnat?.map(kuntametadata.idForMaakuntaName),
    vaihe: apiProjekti.status || undefined,
    vaylamuoto: projekti.velho.vaylamuoto?.map(safeTrim),
    projektipaallikko: projekti.kayttoOikeudet
      .filter((value) => value.tyyppi == API.KayttajaTyyppi.PROJEKTIPAALLIKKO)
      .map((value) => safeTrim(value.nimi))
      .pop(),
    paivitetty: projekti.paivitetty || dayjs().format(),
    muokkaajat: projekti.kayttoOikeudet.map((value) => value.kayttajatunnus),
  };

  return partialDoc;
}

export function adaptProjektiToJulkinenIndex(projekti: API.ProjektiJulkinen, kieli: API.Kieli): Omit<ProjektiDocument, "oid"> | undefined {
  if (projekti) {
    // Use texts from suunnitteluvaihe or from published aloituskuulutus
    const suunnitteluVaihe = projekti.suunnitteluVaihe;
    const aloitusKuulutusJulkaisuJulkinen = projekti.aloitusKuulutusJulkaisut?.[0];
    let nimi: string | undefined;
    let hankkeenKuvaus: string | undefined;
    let publishTimestamp;
    if (suunnitteluVaihe) {
      if (!projekti.kielitiedot) {
        throw new Error("adaptProjektiToJulkinenIndex: projekti.kielitiedot määrittelemättä");
      }
      // Use texts from projekti
      hankkeenKuvaus = suunnitteluVaihe?.hankkeenKuvaus?.[kieli] || undefined;
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

    const vuorovaikutukset = projekti?.suunnitteluVaihe?.vuorovaikutukset;
    const viimeisinVuorovaikutusKierros = vuorovaikutukset?.[vuorovaikutukset?.length - 1];

    if (viimeisinVuorovaikutusKierros) {
      viimeisinVuorovaikutusKierros?.vuorovaikutusTilaisuudet?.forEach((tilaisuus) => {
        if (tilaisuus.paivamaara && tilaisuus.paattymisAika) {
          const tilaisuusPaattyyNumber = Date.parse(tilaisuus.paivamaara + " " + tilaisuus.paattymisAika);

          if (tilaisuusPaattyyNumber && (!viimeinenTilaisuusPaattyyNumber || tilaisuusPaattyyNumber > viimeinenTilaisuusPaattyyNumber)) {
            viimeinenTilaisuusPaattyyString = tilaisuus.paivamaara + " " + tilaisuus.paattymisAika;
            viimeinenTilaisuusPaattyyNumber = tilaisuusPaattyyNumber;
          }
        }
      });
    }

    const docWihtoutOid: Omit<ProjektiDocument, "oid"> = {
      nimi: safeTrim(nimi),
      hankkeenKuvaus,
      projektiTyyppi: projekti.velho.tyyppi || undefined,
      kunnat: projekti.velho.kunnat?.map(kuntametadata.idForKuntaName),
      maakunnat: projekti.velho.maakunnat?.map(kuntametadata.idForMaakuntaName),
      vaihe: projekti.status || undefined,
      viimeinenTilaisuusPaattyy: viimeinenTilaisuusPaattyyString,
      vaylamuoto: projekti.velho.vaylamuoto?.map(safeTrim),
      paivitetty: projekti.paivitetty || dayjs().format(),
      publishTimestamp,
    };
    return docWihtoutOid;
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

export function getAsiatunnus(projekti: DBProjekti): string | null | undefined {
  return projekti.velho?.suunnittelustaVastaavaViranomainen === API.Viranomainen.VAYLAVIRASTO
    ? projekti.velho?.asiatunnusVayla
    : projekti.velho?.asiatunnusELY;
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
