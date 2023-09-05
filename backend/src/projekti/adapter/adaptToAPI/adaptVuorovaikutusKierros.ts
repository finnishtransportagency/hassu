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
import * as API from "../../../../../common/graphql/apiModel";
import {
  adaptAineistot,
  adaptIlmoituksenVastaanottajat,
  adaptLokalisoidutLinkit,
  adaptLokalisoituLinkki,
  adaptLokalisoituTeksti,
  adaptMandatoryStandardiYhteystiedotByAddingTypename,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptStandardiYhteystiedotByAddingTypename,
  adaptYhteystiedotByAddingTypename,
  forEverySaameDo,
} from "../common";
import { fileService } from "../../../files/fileService";
import cloneDeep from "lodash/cloneDeep";
import { ProjektiPaths, VuorovaikutusPaths } from "../../../files/ProjektiPath";
import omitBy from "lodash/omitBy";
import isUndefined from "lodash/isUndefined";
import { adaptLadattuTiedostoToAPI } from ".";
import { isOkToMakeNewVuorovaikutusKierros } from "../../../util/validation";
import { getAsianhallintaSynchronizationStatus } from "../common/adaptAsianhallinta";

export function adaptVuorovaikutusKierros(
  kayttoOikeudet: DBVaylaUser[],
  oid: string,
  vuorovaikutusKierros: VuorovaikutusKierros | null | undefined,
  vuorovaikutusKierrosJulkaisut: VuorovaikutusKierrosJulkaisu[] | null | undefined
): API.VuorovaikutusKierros | undefined {
  if (vuorovaikutusKierros) {
    const { hankkeenKuvaus, tila, arvioSeuraavanVaiheenAlkamisesta, suunnittelunEteneminenJaKesto, palautteidenVastaanottajat } =
      vuorovaikutusKierros;
    if (tila == API.VuorovaikutusKierrosTila.MIGROITU) {
      return { __typename: "VuorovaikutusKierros", tila, vuorovaikutusNumero: vuorovaikutusKierros.vuorovaikutusNumero };
    }

    const paths = new ProjektiPaths(oid).vuorovaikutus(vuorovaikutusKierros);

    const videot: Array<API.LokalisoituLinkki> | undefined =
      (vuorovaikutusKierros.videot
        ?.map((video) => adaptLokalisoituLinkki(video))
        .filter((video) => video) as Array<API.LokalisoituLinkki>) || undefined;
    return {
      __typename: "VuorovaikutusKierros",
      ...(vuorovaikutusKierros as Omit<VuorovaikutusKierros, "vuorovaikutusPDFt">),
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(vuorovaikutusKierros.ilmoituksenVastaanottajat),
      esitettavatYhteystiedot: adaptStandardiYhteystiedotByAddingTypename(kayttoOikeudet, vuorovaikutusKierros.esitettavatYhteystiedot),
      vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(kayttoOikeudet, vuorovaikutusKierros.vuorovaikutusTilaisuudet),
      suunnittelumateriaali: adaptLokalisoidutLinkit(vuorovaikutusKierros.suunnittelumateriaali),
      videot,
      esittelyaineistot: adaptAineistot(vuorovaikutusKierros.esittelyaineistot, paths),
      suunnitelmaluonnokset: adaptAineistot(vuorovaikutusKierros.suunnitelmaluonnokset, paths),
      tila,
      arvioSeuraavanVaiheenAlkamisesta: adaptLokalisoituTeksti(arvioSeuraavanVaiheenAlkamisesta),
      suunnittelunEteneminenJaKesto: adaptLokalisoituTeksti(suunnittelunEteneminenJaKesto),
      hankkeenKuvaus: adaptLokalisoituTeksti(hankkeenKuvaus),
      palautteidenVastaanottajat,
      vuorovaikutusSaamePDFt: adaptVuorovaikutusSaamePDFt(paths, vuorovaikutusKierros.vuorovaikutusSaamePDFt, false),
      isOkToMakeNewVuorovaikutusKierros: isOkToMakeNewVuorovaikutusKierros({
        nahtavillaoloVaiheJulkaisut: true,
        vuorovaikutusKierros,
        vuorovaikutusKierrosJulkaisut,
      }),
    };
  }
  return vuorovaikutusKierros as undefined;
}

export function adaptVuorovaikutusKierrosJulkaisut(
  projekti: DBProjekti,
  julkaisut: VuorovaikutusKierrosJulkaisu[] | null | undefined
): API.VuorovaikutusKierrosJulkaisu[] | undefined {
  if (!julkaisut) {
    return undefined;
  }
  return julkaisut?.map((julkaisu) => adaptVuorovaikutusKierrosJulkaisu(julkaisu, projekti));
}

function adaptVuorovaikutusKierrosJulkaisu(julkaisu: VuorovaikutusKierrosJulkaisu, projekti: DBProjekti): API.VuorovaikutusKierrosJulkaisu {
  const {
    ilmoituksenVastaanottajat,
    yhteystiedot,
    esitettavatYhteystiedot,
    vuorovaikutusTilaisuudet,
    suunnittelumateriaali,
    videot,
    esittelyaineistot,
    suunnitelmaluonnokset,
    tila,
    hankkeenKuvaus,
    vuorovaikutusPDFt: _vuorovaikutusPDFt,
    arvioSeuraavanVaiheenAlkamisesta,
    suunnittelunEteneminenJaKesto,
    vuorovaikutusSaamePDFt,
    asianhallintaEventId,
    ...fieldsToCopyAsIs
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

  const paths = new ProjektiPaths(projekti.oid).vuorovaikutus(julkaisu);
  const apiJulkaisu: API.VuorovaikutusKierrosJulkaisu = {
    ...fieldsToCopyAsIs,
    __typename: "VuorovaikutusKierrosJulkaisu",
    tila,
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
    yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
    esitettavatYhteystiedot: adaptMandatoryStandardiYhteystiedotByAddingTypename(projekti.kayttoOikeudet, esitettavatYhteystiedot),
    vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuusJulkaisut(vuorovaikutusTilaisuudet),
    suunnittelumateriaali: adaptLokalisoidutLinkit(suunnittelumateriaali),
    videot: videot?.map((video) => adaptLokalisoituLinkki(video)).filter((video): video is API.LokalisoituLinkki => !!video),
    esittelyaineistot: adaptAineistot(esittelyaineistot, paths),
    suunnitelmaluonnokset: adaptAineistot(suunnitelmaluonnokset, paths),
    hankkeenKuvaus: adaptLokalisoituTeksti(hankkeenKuvaus),
    arvioSeuraavanVaiheenAlkamisesta: adaptLokalisoituTeksti(arvioSeuraavanVaiheenAlkamisesta),
    suunnittelunEteneminenJaKesto: adaptLokalisoituTeksti(suunnittelunEteneminenJaKesto),
    asianhallintaSynkronointiTila: getAsianhallintaSynchronizationStatus(projekti.synkronoinnit, asianhallintaEventId),
    vuorovaikutusPDFt: adaptVuorovaikutusPDFPaths(projekti.oid, julkaisu),
    vuorovaikutusSaamePDFt: adaptVuorovaikutusSaamePDFt(paths, vuorovaikutusSaamePDFt, false),
  };
  return apiJulkaisu;
}

function adaptVuorovaikutusTilaisuudet(
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
      tilaisuus.nimi = adaptLokalisoituTeksti(nimi);
      tilaisuus.lisatiedot = adaptLokalisoituTeksti(lisatiedot);
      tilaisuus.osoite = adaptLokalisoituTeksti(osoite);
      tilaisuus.paikka = adaptLokalisoituTeksti(paikka);
      tilaisuus.postitoimipaikka = adaptLokalisoituTeksti(postitoimipaikka);
      tilaisuus.postinumero = vuorovaikutusTilaisuus.postinumero;
      tilaisuus.peruttu = vuorovaikutusTilaisuus.peruttu;
      return omitBy(tilaisuus, isUndefined) as API.VuorovaikutusTilaisuus;
    });
  }
  return vuorovaikutusTilaisuudet as undefined;
}

function adaptVuorovaikutusTilaisuusJulkaisut(
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
        tilaisuus.yhteystiedot = adaptYhteystiedotByAddingTypename(yhteystiedot);
      }
      tilaisuus.nimi = adaptLokalisoituTeksti(nimi);
      tilaisuus.lisatiedot = adaptLokalisoituTeksti(lisatiedot);
      tilaisuus.osoite = adaptLokalisoituTeksti(osoite);
      tilaisuus.paikka = adaptLokalisoituTeksti(paikka);
      tilaisuus.postitoimipaikka = adaptLokalisoituTeksti(postitoimipaikka);
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

export function adaptVuorovaikutusSaamePDFt(
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
