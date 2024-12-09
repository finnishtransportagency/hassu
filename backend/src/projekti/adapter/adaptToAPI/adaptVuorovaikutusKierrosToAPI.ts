import {
  DBProjekti,
  DBVaylaUser,
  LocalizedMap,
  StandardiYhteystiedot,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusKutsuSaamePDFt,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusJulkaisu,
  Yhteystieto,
} from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { forEverySaameDo } from "../common";
import { fileService } from "../../../files/fileService";
import cloneDeep from "lodash/cloneDeep";
import { ProjektiPaths, VuorovaikutusPaths } from "../../../files/ProjektiPath";
import omitBy from "lodash/omitBy";
import isUndefined from "lodash/isUndefined";
import {
  adaptAineistotToAPI,
  adaptIlmoituksenVastaanottajatToAPI,
  adaptLadattuTiedostoToAPI,
  adaptLokalisoidutLinkitToAPI,
  adaptLokalisoituTekstiToAPI,
  adaptMandatoryStandardiYhteystiedotByAddingTypename,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptStandardiYhteystiedotByAddingTypename,
} from ".";
import { isOkToMakeNewVuorovaikutusKierros } from "../../../util/validation";
import { getAsianhallintaSynchronizationStatus } from "../common/adaptAsianhallinta";
import { assertIsDefined } from "../../../util/assertions";
import { jaotteleVuorovaikutusAineistot } from "hassu-common/vuorovaikutusAineistoKategoria";

export function adaptVuorovaikutusKierrosToAPI(
  kayttoOikeudet: DBVaylaUser[],
  oid: string,
  vuorovaikutusKierros: VuorovaikutusKierros | null | undefined,
  vuorovaikutusKierrosJulkaisut: VuorovaikutusKierrosJulkaisu[] | null | undefined
): API.VuorovaikutusKierros | undefined {
  if (vuorovaikutusKierros) {
    const {
      hankkeenKuvaus,
      tila,
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      palautteidenVastaanottajat,
      aineistot,
      videot,
      vuorovaikutusNumero,
      esitettavatYhteystiedot,
      ilmoituksenVastaanottajat,
      kysymyksetJaPalautteetViimeistaan,
      palattuNahtavillaolosta,
      selosteVuorovaikutuskierrokselle,
      suunnittelumateriaali,
      vuorovaikutusJulkaisuPaiva,
      vuorovaikutusSaamePDFt,
      vuorovaikutusTilaisuudet,
    } = vuorovaikutusKierros;
    if (tila == API.VuorovaikutusKierrosTila.MIGROITU) {
      return { __typename: "VuorovaikutusKierros", tila, vuorovaikutusNumero: vuorovaikutusKierros.vuorovaikutusNumero };
    }

    const paths = new ProjektiPaths(oid).vuorovaikutus(vuorovaikutusKierros);

    const { esittelyaineistot, suunnitelmaluonnokset } = jaotteleVuorovaikutusAineistot(aineistot) ?? {};
    return {
      __typename: "VuorovaikutusKierros",
      vuorovaikutusNumero,
      kysymyksetJaPalautteetViimeistaan,
      palattuNahtavillaolosta,
      selosteVuorovaikutuskierrokselle,
      vuorovaikutusJulkaisuPaiva,
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToAPI(ilmoituksenVastaanottajat),
      esitettavatYhteystiedot: adaptStandardiYhteystiedotByAddingTypename(kayttoOikeudet, esitettavatYhteystiedot),
      vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudetToAPI(kayttoOikeudet, vuorovaikutusTilaisuudet),
      suunnittelumateriaali: adaptLokalisoidutLinkitToAPI(suunnittelumateriaali),
      videot: adaptLokalisoidutLinkitToAPI(videot),
      esittelyaineistot: adaptAineistotToAPI(esittelyaineistot, paths),
      suunnitelmaluonnokset: adaptAineistotToAPI(suunnitelmaluonnokset, paths),
      tila,
      arvioSeuraavanVaiheenAlkamisesta: adaptLokalisoituTekstiToAPI(arvioSeuraavanVaiheenAlkamisesta),
      suunnittelunEteneminenJaKesto: adaptLokalisoituTekstiToAPI(suunnittelunEteneminenJaKesto),
      hankkeenKuvaus: adaptLokalisoituTekstiToAPI(hankkeenKuvaus),
      palautteidenVastaanottajat,
      vuorovaikutusSaamePDFt: adaptVuorovaikutusSaamePDFtToAPI(paths, vuorovaikutusSaamePDFt, false),
      isOkToMakeNewVuorovaikutusKierros: isOkToMakeNewVuorovaikutusKierros({
        nahtavillaoloVaiheJulkaisut: true,
        vuorovaikutusKierros,
        vuorovaikutusKierrosJulkaisut,
      }),
    };
  }
  return vuorovaikutusKierros as undefined;
}

export function adaptVuorovaikutusKierrosJulkaisutToAPI(
  projekti: DBProjekti,
  julkaisut: VuorovaikutusKierrosJulkaisu[] | null | undefined
): API.VuorovaikutusKierrosJulkaisu[] | undefined {
  if (!julkaisut) {
    return undefined;
  }
  return julkaisut?.map((julkaisu) => adaptVuorovaikutusKierrosJulkaisuToAPI(julkaisu, projekti));
}

function adaptVuorovaikutusKierrosJulkaisuToAPI(
  julkaisu: VuorovaikutusKierrosJulkaisu,
  projekti: DBProjekti
): API.VuorovaikutusKierrosJulkaisu {
  const {
    ilmoituksenVastaanottajat,
    yhteystiedot,
    esitettavatYhteystiedot,
    vuorovaikutusTilaisuudet,
    suunnittelumateriaali,
    videot,
    aineistot,
    tila,
    hankkeenKuvaus,
    vuorovaikutusPDFt: _vuorovaikutusPDFt,
    arvioSeuraavanVaiheenAlkamisesta,
    suunnittelunEteneminenJaKesto,
    vuorovaikutusSaamePDFt,
    asianhallintaEventId,
    id,
    kysymyksetJaPalautteetViimeistaan,
    selosteVuorovaikutuskierrokselle,
    vuorovaikutusJulkaisuPaiva,
    jakautuminen: _jakautuminen,
    kopioituProjektista,
  } = julkaisu;

  if (tila == API.VuorovaikutusKierrosTila.MIGROITU) {
    return {
      __typename: "VuorovaikutusKierrosJulkaisu",
      id: julkaisu.id,
      tila,
      yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      esitettavatYhteystiedot: adaptMandatoryStandardiYhteystiedotByAddingTypename(projekti.kayttoOikeudet, esitettavatYhteystiedot),
    };
  }

  if (!hankkeenKuvaus) {
    throw new Error("adaptVuorovaikutusKierrosJulkaisu: julkaisu.hankkeenKuvaus määrittelemättä");
  } else if (!ilmoituksenVastaanottajat) {
    throw new Error("adaptVuorovaikutusKierrosJulkaisu: julkaisu.ilmoituksenVastaanottajat määrittelemättä");
  } else if (!yhteystiedot) {
    throw new Error("adaptVuorovaikutusKierrosJulkaisu: julkaisu.yhteystiedot määrittelemättä");
  }

  const { esittelyaineistot, suunnitelmaluonnokset } = jaotteleVuorovaikutusAineistot(aineistot) ?? {};

  const paths = new ProjektiPaths(projekti.oid).vuorovaikutus(julkaisu);
  const apiJulkaisu: API.VuorovaikutusKierrosJulkaisu = {
    id,
    kysymyksetJaPalautteetViimeistaan,
    selosteVuorovaikutuskierrokselle,
    vuorovaikutusJulkaisuPaiva,
    __typename: "VuorovaikutusKierrosJulkaisu",
    tila,
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToAPI(ilmoituksenVastaanottajat),
    yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
    esitettavatYhteystiedot: adaptMandatoryStandardiYhteystiedotByAddingTypename(projekti.kayttoOikeudet, esitettavatYhteystiedot),
    vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuusJulkaisutToAPI(vuorovaikutusTilaisuudet),
    suunnittelumateriaali: adaptLokalisoidutLinkitToAPI(suunnittelumateriaali),
    videot: adaptLokalisoidutLinkitToAPI(videot),
    esittelyaineistot: adaptAineistotToAPI(esittelyaineistot, paths),
    suunnitelmaluonnokset: adaptAineistotToAPI(suunnitelmaluonnokset, paths),
    hankkeenKuvaus: adaptLokalisoituTekstiToAPI(hankkeenKuvaus),
    arvioSeuraavanVaiheenAlkamisesta: adaptLokalisoituTekstiToAPI(arvioSeuraavanVaiheenAlkamisesta),
    suunnittelunEteneminenJaKesto: adaptLokalisoituTekstiToAPI(suunnittelunEteneminenJaKesto),
    asianhallintaSynkronointiTila: getAsianhallintaSynchronizationStatus(projekti.synkronoinnit, asianhallintaEventId),
    vuorovaikutusPDFt: adaptVuorovaikutusPDFPaths(projekti.oid, julkaisu),
    vuorovaikutusSaamePDFt: adaptVuorovaikutusSaamePDFtToAPI(paths, vuorovaikutusSaamePDFt, false),
    julkaisuOnKopio: !!kopioituProjektista,
  };
  return apiJulkaisu;
}

function adaptVuorovaikutusTilaisuudetToAPI(
  kayttoOikeudet: DBVaylaUser[],
  vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuus> | null | undefined
): API.VuorovaikutusTilaisuus[] | undefined {
  if (vuorovaikutusTilaisuudet) {
    const vuorovaikutusTilaisuudetCopy = cloneDeep(vuorovaikutusTilaisuudet);
    return vuorovaikutusTilaisuudetCopy.map((vuorovaikutusTilaisuus) => {
      const esitettavatYhteystiedot: StandardiYhteystiedot | undefined = vuorovaikutusTilaisuus.esitettavatYhteystiedot;
      const nimi: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.nimi;
      const lisatiedot: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.lisatiedot;
      const osoite: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.osoite;
      const paikka: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.paikka;
      const postitoimipaikka: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.postitoimipaikka;
      const { tyyppi, paivamaara, alkamisAika, paattymisAika } = vuorovaikutusTilaisuus;
      const tilaisuus: API.VuorovaikutusTilaisuus = {
        tyyppi,
        paivamaara,
        alkamisAika,
        paattymisAika,
        __typename: "VuorovaikutusTilaisuus",
      };
      if (tilaisuus.tyyppi === API.VuorovaikutusTilaisuusTyyppi.VERKOSSA) {
        tilaisuus.kaytettavaPalvelu = vuorovaikutusTilaisuus.kaytettavaPalvelu;
        tilaisuus.linkki = vuorovaikutusTilaisuus.linkki;
      }
      if (tilaisuus.tyyppi === API.VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) {
        tilaisuus.esitettavatYhteystiedot = adaptStandardiYhteystiedotByAddingTypename(kayttoOikeudet, esitettavatYhteystiedot);
      }
      tilaisuus.nimi = adaptLokalisoituTekstiToAPI(nimi);
      tilaisuus.lisatiedot = adaptLokalisoituTekstiToAPI(lisatiedot);
      tilaisuus.osoite = adaptLokalisoituTekstiToAPI(osoite);
      tilaisuus.paikka = adaptLokalisoituTekstiToAPI(paikka);
      tilaisuus.postitoimipaikka = adaptLokalisoituTekstiToAPI(postitoimipaikka);
      tilaisuus.postinumero = vuorovaikutusTilaisuus.postinumero;
      tilaisuus.peruttu = vuorovaikutusTilaisuus.peruttu;
      return omitBy(tilaisuus, isUndefined) as API.VuorovaikutusTilaisuus;
    });
  }
  return vuorovaikutusTilaisuudet as undefined;
}

function adaptVuorovaikutusTilaisuusJulkaisutToAPI(
  vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuusJulkaisu> | null | undefined
): API.VuorovaikutusTilaisuusJulkaisu[] | undefined {
  if (vuorovaikutusTilaisuudet) {
    const vuorovaikutusTilaisuudetCopy = cloneDeep(vuorovaikutusTilaisuudet);
    return vuorovaikutusTilaisuudetCopy.map((vuorovaikutusTilaisuus, index) => {
      const yhteystiedot: Yhteystieto[] | undefined = vuorovaikutusTilaisuus.yhteystiedot;
      const nimi: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.nimi;
      const lisatiedot: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.lisatiedot;
      const osoite: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.osoite;
      const paikka: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.paikka;
      const postitoimipaikka: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.postitoimipaikka;
      const { tyyppi, paivamaara, alkamisAika, paattymisAika } = vuorovaikutusTilaisuus;
      const tilaisuus: API.VuorovaikutusTilaisuusJulkaisu = {
        id: index,
        tyyppi,
        paivamaara,
        alkamisAika,
        paattymisAika,
        __typename: "VuorovaikutusTilaisuusJulkaisu",
      };
      if (tilaisuus.tyyppi === API.VuorovaikutusTilaisuusTyyppi.VERKOSSA) {
        tilaisuus.kaytettavaPalvelu = vuorovaikutusTilaisuus.kaytettavaPalvelu;
        tilaisuus.linkki = vuorovaikutusTilaisuus.linkki;
      }
      if (tilaisuus.tyyppi === API.VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) {
        assertIsDefined(yhteystiedot);
        tilaisuus.yhteystiedot = adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot);
      }
      tilaisuus.nimi = adaptLokalisoituTekstiToAPI(nimi);
      tilaisuus.lisatiedot = adaptLokalisoituTekstiToAPI(lisatiedot);
      tilaisuus.osoite = adaptLokalisoituTekstiToAPI(osoite);
      tilaisuus.paikka = adaptLokalisoituTekstiToAPI(paikka);
      tilaisuus.postitoimipaikka = adaptLokalisoituTekstiToAPI(postitoimipaikka);
      tilaisuus.postinumero = vuorovaikutusTilaisuus.postinumero;
      tilaisuus.peruttu = vuorovaikutusTilaisuus.peruttu;
      return omitBy(tilaisuus, isUndefined) as API.VuorovaikutusTilaisuusJulkaisu;
    });
  }
  return vuorovaikutusTilaisuudet as undefined;
}

function adaptVuorovaikutusPDFPaths(oid: string, vuorovaikutus: VuorovaikutusKierrosJulkaisu): API.VuorovaikutusPDFt | undefined {
  const vuorovaikutusPdfs = vuorovaikutus.vuorovaikutusPDFt;
  if (!vuorovaikutusPdfs) {
    return undefined;
  }

  const result: { [Kieli: string]: API.VuorovaikutusPDF } = {};
  for (const kieli in vuorovaikutusPdfs) {
    const pdfs = vuorovaikutusPdfs[kieli as API.Kieli];
    if (pdfs) {
      result[kieli] = {
        __typename: "VuorovaikutusPDF",
        kutsuPDFPath: fileService.getYllapitoPathForProjektiFile(new ProjektiPaths(oid).vuorovaikutus(vuorovaikutus), pdfs.kutsuPDFPath),
      };
    }
  }
  return { __typename: "VuorovaikutusPDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
}

export function adaptVuorovaikutusSaamePDFtToAPI(
  projektiPath: VuorovaikutusPaths,
  vuorovaikutusSaamePDFt: VuorovaikutusKutsuSaamePDFt | null | undefined,
  julkinen: boolean
): API.VuorovaikutusKutsuSaamePDFt | undefined {
  if (!vuorovaikutusSaamePDFt) {
    return undefined;
  }

  const result: API.VuorovaikutusKutsuSaamePDFt = { __typename: "VuorovaikutusKutsuSaamePDFt" };
  forEverySaameDo((kieli) => {
    const ladattuTiedosto = vuorovaikutusSaamePDFt[kieli];
    if (ladattuTiedosto) {
      result[kieli] = adaptLadattuTiedostoToAPI(projektiPath, ladattuTiedosto, julkinen);
    }
  });
  return result;
}
