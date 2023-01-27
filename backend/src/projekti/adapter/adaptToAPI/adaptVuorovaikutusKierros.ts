import {
  DBVaylaUser,
  StandardiYhteystiedot,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusJulkaisu,
  Yhteystieto,
} from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { VuorovaikutusKierrosTila } from "../../../../../common/graphql/apiModel";
import {
  adaptAineistot,
  adaptLokalisoituTeksti,
  adaptIlmoituksenVastaanottajat,
  adaptStandardiYhteystiedotByAddingTypename,
  adaptYhteystiedotByAddingTypename,
  adaptLokalisoituLinkki,
} from "../common";
import { fileService } from "../../../files/fileService";
import cloneDeep from "lodash/cloneDeep";
import { ProjektiPaths } from "../../../files/ProjektiPath";

export function adaptVuorovaikutusKierros(
  kayttoOikeudet: DBVaylaUser[],
  oid: string,
  vuorovaikutusKierros: VuorovaikutusKierros | null | undefined
): API.VuorovaikutusKierros | undefined {
  if (vuorovaikutusKierros) {
    const { hankkeenKuvaus, tila, arvioSeuraavanVaiheenAlkamisesta, suunnittelunEteneminenJaKesto, palautteidenVastaanottajat } =
      vuorovaikutusKierros;
    if (tila == VuorovaikutusKierrosTila.MIGROITU) {
      return { __typename: "VuorovaikutusKierros", tila, vuorovaikutusNumero: vuorovaikutusKierros.vuorovaikutusNumero };
    }

    const paths = new ProjektiPaths(oid).vuorovaikutus(vuorovaikutusKierros);

    const videot: Array<API.LokalisoituLinkki> | undefined =
      (vuorovaikutusKierros.videot
        ?.map((video) => adaptLokalisoituLinkki(video))
        .filter((video) => video) as Array<API.LokalisoituLinkki>) || undefined;
    const apiVuorovaikutusKierros: API.VuorovaikutusKierros = {
      __typename: "VuorovaikutusKierros",
      ...(vuorovaikutusKierros as Omit<VuorovaikutusKierros, "vuorovaikutusPDFt">),
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(vuorovaikutusKierros.ilmoituksenVastaanottajat),
      esitettavatYhteystiedot: adaptStandardiYhteystiedotByAddingTypename(kayttoOikeudet, vuorovaikutusKierros.esitettavatYhteystiedot),
      vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(kayttoOikeudet, vuorovaikutusKierros.vuorovaikutusTilaisuudet),
      suunnittelumateriaali: adaptLokalisoituLinkki(vuorovaikutusKierros.suunnittelumateriaali),
      videot,
      esittelyaineistot: adaptAineistot(vuorovaikutusKierros.esittelyaineistot, paths),
      suunnitelmaluonnokset: adaptAineistot(vuorovaikutusKierros.suunnitelmaluonnokset, paths),
      tila,
      arvioSeuraavanVaiheenAlkamisesta: adaptLokalisoituTeksti(arvioSeuraavanVaiheenAlkamisesta),
      suunnittelunEteneminenJaKesto: adaptLokalisoituTeksti(suunnittelunEteneminenJaKesto),
      hankkeenKuvaus: adaptLokalisoituTeksti(hankkeenKuvaus),
      palautteidenVastaanottajat,
    };

    return apiVuorovaikutusKierros;
  }
  return vuorovaikutusKierros as undefined;
}

export function adaptVuorovaikutusKierrosJulkaisut(
  oid: string,
  julkaisut: VuorovaikutusKierrosJulkaisu[] | null | undefined
): API.VuorovaikutusKierrosJulkaisu[] | undefined {
  if (!julkaisut) {
    return undefined;
  }
  return julkaisut?.map((julkaisu) => {
    const {
      ilmoituksenVastaanottajat,
      yhteystiedot,
      vuorovaikutusTilaisuudet,
      suunnittelumateriaali,
      videot,
      esittelyaineistot,
      suunnitelmaluonnokset,
      tila,
      hankkeenKuvaus,
      vuorovaikutusPDFt,
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      ...fieldsToCopyAsIs
    } = julkaisu;

    if (tila == VuorovaikutusKierrosTila.MIGROITU) {
      return {
        __typename: "VuorovaikutusKierrosJulkaisu",
        id: julkaisu.id,
        tila,
        yhteystiedot: adaptYhteystiedotByAddingTypename(yhteystiedot),
      };
    }

    if (!vuorovaikutusPDFt && VuorovaikutusKierrosTila.JULKINEN) {
      throw new Error("adaptVuorovaikutusKierrosJulkaisu: julkaisu.vuorovaikutusPDFt määrittelemättä");
    }
    if (!hankkeenKuvaus) {
      throw new Error("adaptVuorovaikutusKierrosJulkaisu: julkaisu.hankkeenKuvaus määrittelemättä");
    }
    if (!ilmoituksenVastaanottajat) {
      throw new Error("adaptVuorovaikutusKierrosJulkaisu: julkaisu.ilmoituksenVastaanottajat määrittelemättä");
    }
    if (!yhteystiedot) {
      throw new Error("adaptVuorovaikutusKierrosJulkaisu: julkaisu.yhteystiedot määrittelemättä");
    }

    const paths = new ProjektiPaths(oid).vuorovaikutus(julkaisu);

    const videotAdaptoituna: Array<API.LokalisoituLinkki> | undefined =
      (videot?.map((video) => adaptLokalisoituLinkki(video)).filter((video) => video) as Array<API.LokalisoituLinkki>) || undefined;

    const palautetaan: API.VuorovaikutusKierrosJulkaisu = {
      ...fieldsToCopyAsIs,
      __typename: "VuorovaikutusKierrosJulkaisu",
      tila,
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
      yhteystiedot: adaptYhteystiedotByAddingTypename(yhteystiedot),
      vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuusJulkaisut(vuorovaikutusTilaisuudet),
      suunnittelumateriaali: adaptLokalisoituLinkki(suunnittelumateriaali),
      videot: videotAdaptoituna,
      esittelyaineistot: adaptAineistot(esittelyaineistot, paths),
      suunnitelmaluonnokset: adaptAineistot(suunnitelmaluonnokset, paths),
      hankkeenKuvaus: adaptLokalisoituTeksti(hankkeenKuvaus),
      arvioSeuraavanVaiheenAlkamisesta: adaptLokalisoituTeksti(arvioSeuraavanVaiheenAlkamisesta),
      suunnittelunEteneminenJaKesto: adaptLokalisoituTeksti(suunnittelunEteneminenJaKesto),
    };
    if (vuorovaikutusPDFt) {
      palautetaan.vuorovaikutusPDFt = adaptVuorovaikutusPDFPaths(oid, julkaisu);
    }
    return palautetaan;
  });
}

function adaptVuorovaikutusTilaisuudet(
  kayttoOikeudet: DBVaylaUser[],
  vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuus> | null | undefined
): API.VuorovaikutusTilaisuus[] | undefined {
  if (vuorovaikutusTilaisuudet) {
    const vuorovaikutusTilaisuudetCopy = cloneDeep(vuorovaikutusTilaisuudet);
    return vuorovaikutusTilaisuudetCopy.map((vuorovaikutusTilaisuus) => {
      const esitettavatYhteystiedot: StandardiYhteystiedot | undefined = vuorovaikutusTilaisuus.esitettavatYhteystiedot;
      delete vuorovaikutusTilaisuus.esitettavatYhteystiedot;
      const tilaisuus: API.VuorovaikutusTilaisuus = {
        ...(vuorovaikutusTilaisuus as Omit<API.VuorovaikutusTilaisuus, "esitettavatYhteystiedot">),
        __typename: "VuorovaikutusTilaisuus",
      };
      if (tilaisuus.tyyppi === API.VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) {
        tilaisuus.esitettavatYhteystiedot = adaptStandardiYhteystiedotByAddingTypename(kayttoOikeudet, esitettavatYhteystiedot);
      }
      if (tilaisuus.nimi) {
        tilaisuus.nimi = adaptLokalisoituTeksti(vuorovaikutusTilaisuus.nimi);
      }
      if (tilaisuus.Saapumisohjeet) {
        tilaisuus.Saapumisohjeet = adaptLokalisoituTeksti(vuorovaikutusTilaisuus.Saapumisohjeet);
      }
      if (tilaisuus.osoite) {
        tilaisuus.osoite = adaptLokalisoituTeksti(vuorovaikutusTilaisuus.osoite);
      }
      if (tilaisuus.paikka) {
        tilaisuus.paikka = adaptLokalisoituTeksti(vuorovaikutusTilaisuus.paikka);
      }
      if (tilaisuus.postitoimipaikka) {
        tilaisuus.postitoimipaikka = adaptLokalisoituTeksti(vuorovaikutusTilaisuus.postitoimipaikka);
      }
      return tilaisuus;
    });
  }
  return vuorovaikutusTilaisuudet as undefined;
}

function adaptVuorovaikutusTilaisuusJulkaisut(
  vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuusJulkaisu> | null | undefined
): API.VuorovaikutusTilaisuusJulkaisu[] | undefined {
  if (vuorovaikutusTilaisuudet) {
    const vuorovaikutusTilaisuudetCopy = cloneDeep(vuorovaikutusTilaisuudet);
    return vuorovaikutusTilaisuudetCopy.map((vuorovaikutusTilaisuus) => {
      const yhteystiedot: Yhteystieto[] | undefined = vuorovaikutusTilaisuus.yhteystiedot;
      delete vuorovaikutusTilaisuus.yhteystiedot;
      const tilaisuus: API.VuorovaikutusTilaisuusJulkaisu = {
        ...(vuorovaikutusTilaisuus as Omit<API.VuorovaikutusTilaisuusJulkaisu, "yhteystiedot">),
        __typename: "VuorovaikutusTilaisuusJulkaisu",
      };
      if (tilaisuus.tyyppi === API.VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) {
        tilaisuus.yhteystiedot = adaptYhteystiedotByAddingTypename(yhteystiedot);
      }
      if (tilaisuus.nimi) {
        tilaisuus.nimi = adaptLokalisoituTeksti(vuorovaikutusTilaisuus.nimi);
      }
      if (tilaisuus.Saapumisohjeet) {
        tilaisuus.Saapumisohjeet = adaptLokalisoituTeksti(vuorovaikutusTilaisuus.Saapumisohjeet);
      }
      if (tilaisuus.osoite) {
        tilaisuus.osoite = adaptLokalisoituTeksti(vuorovaikutusTilaisuus.osoite);
      }
      if (tilaisuus.paikka) {
        tilaisuus.paikka = adaptLokalisoituTeksti(vuorovaikutusTilaisuus.paikka);
      }
      if (tilaisuus.postitoimipaikka) {
        tilaisuus.postitoimipaikka = adaptLokalisoituTeksti(vuorovaikutusTilaisuus.postitoimipaikka);
      }
      return tilaisuus;
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
        kutsuPDFPath: fileService.getYllapitoPathForProjektiFile(new ProjektiPaths(oid), pdfs.kutsuPDFPath),
      };
    }
  }
  return { __typename: "VuorovaikutusPDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
}
