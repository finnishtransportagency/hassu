import * as API from "hassu-common/graphql/apiModel";
import {
  DBProjekti,
  LocalizedMap,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusTilaisuusJulkaisu,
  Yhteystieto,
} from "../../../../database/model";
import {
  ProjektiVuorovaikutuksilla,
  collectJulkinenVuorovaikutusSorted,
  collectVuorovaikutusKierrosJulkinen,
} from "../../../../util/vuorovaikutus";
import { assertIsDefined } from "../../../../util/assertions";
import { parseDate } from "../../../../util/dateUtil";
import { PathTuple, ProjektiPaths } from "../../../../files/ProjektiPath";
import {
  adaptAineistotJulkinen,
  adaptLokalisoidutLinkitToAPI,
  adaptLokalisoituTekstiToAPI,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptVuorovaikutusSaamePDFtToAPI,
  adaptYhteystiedotByAddingTypename,
} from "..";
import { ProjektiScheduleManager, isVerkkotilaisuusLinkkiVisible } from "../../../../sqsEvents/projektiScheduleManager";
import { jaotteleVuorovaikutusAineistot } from "hassu-common/vuorovaikutusAineistoKategoria";
import cloneDeep from "lodash/cloneDeep";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { fileService } from "../../../../files/fileService";

export function adaptVuorovaikutusKierroksetJulkinen(dbProjekti: DBProjekti): API.VuorovaikutusJulkinen | undefined {
  const vuorovaikutukset = dbProjekti.vuorovaikutusKierrosJulkaisut;
  if (vuorovaikutukset && vuorovaikutukset.length > 0) {
    const julkaistutVuorovaikutukset: VuorovaikutusKierrosJulkaisu[] =
      collectVuorovaikutusKierrosJulkinen<VuorovaikutusKierrosJulkaisu>(vuorovaikutukset);
    if (!julkaistutVuorovaikutukset.length) return undefined;
    const julkaistutTilaisuudet: VuorovaikutusTilaisuusJulkaisu[] = collectJulkinenVuorovaikutusSorted(
      dbProjekti as ProjektiVuorovaikutuksilla
    );
    const viimeisinVuorovaikutusKierros: VuorovaikutusKierrosJulkaisu = julkaistutVuorovaikutukset[julkaistutVuorovaikutukset.length - 1];

    assertIsDefined(viimeisinVuorovaikutusKierros.vuorovaikutusJulkaisuPaiva);
    const julkaisuPaiva = parseDate(viimeisinVuorovaikutusKierros.vuorovaikutusJulkaisuPaiva);
    const vuorovaikutusPaths = new ProjektiPaths(dbProjekti.oid).vuorovaikutus(viimeisinVuorovaikutusKierros);
    const videotAdaptoituna: Array<API.LokalisoituLinkki> | undefined = adaptLokalisoidutLinkitToAPI(viimeisinVuorovaikutusKierros.videot);

    const isAineistoVisible = new ProjektiScheduleManager(dbProjekti)
      .getVuorovaikutusKierros()
      .isAineistoVisible(viimeisinVuorovaikutusKierros);

    const { esittelyaineistot, suunnitelmaluonnokset } = jaotteleVuorovaikutusAineistot(viimeisinVuorovaikutusKierros.aineistot) ?? {};

    const vuorovaikutusJulkinen: API.VuorovaikutusJulkinen = {
      __typename: "VuorovaikutusJulkinen",
      vuorovaikutusNumero: viimeisinVuorovaikutusKierros.id,
      tila:
        dbProjekti.vuorovaikutusKierros?.tila === API.VuorovaikutusKierrosTila.MIGROITU
          ? API.VuorovaikutusKierrosTila.MIGROITU
          : API.VuorovaikutusKierrosTila.JULKINEN,
      hankkeenKuvaus: adaptLokalisoituTekstiToAPI(viimeisinVuorovaikutusKierros.hankkeenKuvaus),
      arvioSeuraavanVaiheenAlkamisesta: adaptLokalisoituTekstiToAPI(viimeisinVuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta),
      suunnittelunEteneminenJaKesto: adaptLokalisoituTekstiToAPI(viimeisinVuorovaikutusKierros.suunnittelunEteneminenJaKesto),
      vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(julkaistutTilaisuudet),
      vuorovaikutusJulkaisuPaiva: viimeisinVuorovaikutusKierros.vuorovaikutusJulkaisuPaiva,
      kysymyksetJaPalautteetViimeistaan: viimeisinVuorovaikutusKierros.kysymyksetJaPalautteetViimeistaan,
      videot: videotAdaptoituna,
      suunnittelumateriaali: adaptLokalisoidutLinkitToAPI(viimeisinVuorovaikutusKierros.suunnittelumateriaali),
      esittelyaineistot: isAineistoVisible
        ? adaptAineistotJulkinen(esittelyaineistot, vuorovaikutusPaths.aineisto, julkaisuPaiva)
        : undefined,
      suunnitelmaluonnokset: isAineistoVisible
        ? adaptAineistotJulkinen(suunnitelmaluonnokset, vuorovaikutusPaths.aineisto, julkaisuPaiva)
        : undefined,
      yhteystiedot: adaptYhteystiedotByAddingTypename(viimeisinVuorovaikutusKierros.yhteystiedot) as API.Yhteystieto[],
      vuorovaikutusPDFt: adaptVuorovaikutusPDFPaths(vuorovaikutusPaths, viimeisinVuorovaikutusKierros),
      vuorovaikutusSaamePDFt: adaptVuorovaikutusSaamePDFtToAPI(
        vuorovaikutusPaths,
        viimeisinVuorovaikutusKierros.vuorovaikutusSaamePDFt,
        true
      ),
      kopioituToiseltaProjektilta: viimeisinVuorovaikutusKierros.kopioituToiseltaProjektilta,
    };
    return vuorovaikutusJulkinen;
  } else if (dbProjekti.vuorovaikutusKierros?.tila === API.VuorovaikutusKierrosTila.MIGROITU) {
    return {
      __typename: "VuorovaikutusJulkinen",
      vuorovaikutusNumero: 1,
      tila: API.VuorovaikutusKierrosTila.MIGROITU,
      yhteystiedot: [],
    };
  }
  return undefined;
}

function adaptVuorovaikutusTilaisuudet(
  vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuusJulkaisu>
): API.VuorovaikutusTilaisuusJulkinen[] {
  const vuorovaikutusTilaisuudetCopy = cloneDeep(vuorovaikutusTilaisuudet);
  return vuorovaikutusTilaisuudetCopy.map((vuorovaikutusTilaisuus) => {
    const yhteystiedot: Yhteystieto[] | undefined = vuorovaikutusTilaisuus.yhteystiedot;
    const nimi: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.nimi;
    const lisatiedot: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.lisatiedot;
    const osoite: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.osoite;
    const paikka: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.paikka;
    const postitoimipaikka: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.postitoimipaikka;
    const { tyyppi, paivamaara, alkamisAika, paattymisAika, peruttu } = vuorovaikutusTilaisuus;
    const tilaisuus: API.VuorovaikutusTilaisuusJulkinen = {
      tyyppi,
      paivamaara,
      alkamisAika,
      paattymisAika,
      peruttu,
      __typename: "VuorovaikutusTilaisuusJulkinen",
    };
    if (tilaisuus.tyyppi === API.VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) {
      assertIsDefined(yhteystiedot);
      tilaisuus.yhteystiedot = adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot);
    }
    if (tilaisuus.tyyppi === API.VuorovaikutusTilaisuusTyyppi.VERKOSSA) {
      tilaisuus.kaytettavaPalvelu = vuorovaikutusTilaisuus.kaytettavaPalvelu;
      if (isVerkkotilaisuusLinkkiVisible(vuorovaikutusTilaisuus)) {
        tilaisuus.linkki = vuorovaikutusTilaisuus.linkki;
      }
    }
    if (nimi) {
      tilaisuus.nimi = adaptLokalisoituTekstiToAPI(nimi);
    }
    if (lisatiedot) {
      tilaisuus.lisatiedot = adaptLokalisoituTekstiToAPI(lisatiedot);
    }
    if (osoite) {
      tilaisuus.osoite = adaptLokalisoituTekstiToAPI(osoite);
    }
    if (paikka) {
      tilaisuus.paikka = adaptLokalisoituTekstiToAPI(paikka);
    }
    if (postitoimipaikka) {
      tilaisuus.postitoimipaikka = adaptLokalisoituTekstiToAPI(postitoimipaikka);
    }
    if (vuorovaikutusTilaisuus.postinumero) {
      tilaisuus.postinumero = vuorovaikutusTilaisuus.postinumero;
    }
    return tilaisuus;
  });
}

function adaptVuorovaikutusPDFPaths(
  vuorovaikutusPaths: PathTuple,
  vuorovaikutus: VuorovaikutusKierrosJulkaisu
): API.VuorovaikutusPDFt | undefined {
  const vuorovaikutuspdfs = vuorovaikutus.vuorovaikutusPDFt;
  if (!vuorovaikutuspdfs) {
    return undefined;
  }
  const result: Partial<API.VuorovaikutusPDFt> = {};
  if (vuorovaikutuspdfs && !vuorovaikutuspdfs[API.Kieli.SUOMI]) {
    throw new Error(`adaptVuorovaikutusPDFPaths: vuorovaikutuspdfs.${API.Kieli.SUOMI} määrittelemättä`);
  }
  for (const kieli in vuorovaikutuspdfs) {
    const pdfs = vuorovaikutuspdfs[kieli as API.Kieli];
    if (pdfs) {
      result[kieli as KaannettavaKieli] = {
        __typename: "VuorovaikutusPDF",
        kutsuPDFPath: fileService.getPublicPathForProjektiFile(vuorovaikutusPaths, pdfs.kutsuPDFPath),
      };
    }
  }
  return { __typename: "VuorovaikutusPDFt", [API.Kieli.SUOMI]: result[API.Kieli.SUOMI] as API.VuorovaikutusPDF, ...result };
}
