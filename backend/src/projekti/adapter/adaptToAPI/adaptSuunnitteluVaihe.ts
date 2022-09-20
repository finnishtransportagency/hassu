import {
  DBVaylaUser,
  LocalizedMap,
  SuunnitteluVaihe,
  Vuorovaikutus,
  VuorovaikutusPDF,
  VuorovaikutusTilaisuus,
} from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import {
  adaptAineistot,
  adaptHankkeenKuvaus,
  adaptIlmoituksenVastaanottajat,
  adaptLinkkiByAddingTypename,
  adaptLinkkiListByAddingTypename,
  adaptStandardiYhteystiedotByAddingProjari,
  adaptYhteystiedotByAddingTypename,
} from "../common";
import { fileService } from "../../../files/fileService";

export function adaptSuunnitteluVaihe(
  oid: string,
  kayttoOikeudet: DBVaylaUser[],
  suunnitteluVaihe: SuunnitteluVaihe,
  vuorovaikutukset: Array<Vuorovaikutus>
): API.SuunnitteluVaihe {
  if (suunnitteluVaihe) {
    const { julkinen, arvioSeuraavanVaiheenAlkamisesta, suunnittelunEteneminenJaKesto, palautteidenVastaanottajat } = suunnitteluVaihe;
    return {
      julkinen,
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      hankkeenKuvaus: adaptHankkeenKuvaus(suunnitteluVaihe.hankkeenKuvaus),
      vuorovaikutukset: adaptVuorovaikutukset(oid, kayttoOikeudet, vuorovaikutukset),
      palautteidenVastaanottajat,
      __typename: "SuunnitteluVaihe",
    };
  }
  return suunnitteluVaihe as undefined;
}

function adaptVuorovaikutukset(oid: string, kayttoOikeudet: DBVaylaUser[], vuorovaikutukset: Array<Vuorovaikutus>): API.Vuorovaikutus[] {
  if (vuorovaikutukset && vuorovaikutukset.length > 0) {
    return vuorovaikutukset.map(
      (vuorovaikutus) =>
        ({
          ...vuorovaikutus,
          ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(vuorovaikutus.ilmoituksenVastaanottajat),
          esitettavatYhteystiedot: adaptStandardiYhteystiedotByAddingProjari(kayttoOikeudet, vuorovaikutus.esitettavatYhteystiedot),
          vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(vuorovaikutus.vuorovaikutusTilaisuudet),
          suunnittelumateriaali: adaptLinkkiByAddingTypename(vuorovaikutus.suunnittelumateriaali),
          videot: adaptLinkkiListByAddingTypename(vuorovaikutus.videot),
          esittelyaineistot: adaptAineistot(vuorovaikutus.esittelyaineistot),
          suunnitelmaluonnokset: adaptAineistot(vuorovaikutus.suunnitelmaluonnokset),
          vuorovaikutusPDFt: adaptVuorovaikutusPDFPaths(oid, vuorovaikutus.vuorovaikutusPDFt),
          __typename: "Vuorovaikutus",
        } as API.Vuorovaikutus)
    );
  }
  return vuorovaikutukset as undefined;
}

function adaptVuorovaikutusTilaisuudet(vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuus>): API.VuorovaikutusTilaisuus[] {
  if (vuorovaikutusTilaisuudet) {
    return vuorovaikutusTilaisuudet.map((vuorovaikutusTilaisuus) => ({
      ...vuorovaikutusTilaisuus,
      esitettavatYhteystiedot: adaptYhteystiedotByAddingTypename(vuorovaikutusTilaisuus.esitettavatYhteystiedot),
      __typename: "VuorovaikutusTilaisuus",
    }));
  }
  return vuorovaikutusTilaisuudet as undefined;
}

function adaptVuorovaikutusPDFPaths(oid: string, pdfs: LocalizedMap<VuorovaikutusPDF>): API.VuorovaikutusPDFt | undefined {
  if (!pdfs) {
    return undefined;
  }

  const result: { [Kieli: string]: API.VuorovaikutusPDF } = {};
  for (const kieli in pdfs) {
    result[kieli] = {
      __typename: "VuorovaikutusPDF",
      kutsuPDFPath: fileService.getYllapitoPathForProjektiFile(oid, pdfs[kieli].kutsuPDFPath),
    };
  }
  return { __typename: "VuorovaikutusPDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
}
