import {
  Palaute,
  SuunnitteluVaihe,
  Vuorovaikutus,
  VuorovaikutusTilaisuus,
  LocalizedMap,
  VuorovaikutusPDF,
} from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";
import {
  adaptLinkki as lisaaLinkkiTypename,
  adaptLinkkiList as lisaaLinkkiTypenameListaan,
  adaptYhteystiedot as lisaaYhteystietoTypenameListaan,
} from "../commonAdapterUtil/lisaaTypename";
import { adaptHankkeenKuvaus } from "../commonAdapterUtil/adaptHankkeenKuvaus";
import { adaptAineistot } from "../commonAdapterUtil/adaptAineistot";
import { fileService } from "../../files/fileService";

export default function adaptSuunnitteluVaihe(
  oid: string,
  suunnitteluVaihe: SuunnitteluVaihe,
  vuorovaikutukset: Array<Vuorovaikutus>,
  palautteet: Array<Palaute>
): API.SuunnitteluVaihe {
  if (suunnitteluVaihe) {
    const { julkinen, arvioSeuraavanVaiheenAlkamisesta, suunnittelunEteneminenJaKesto, palautteidenVastaanottajat } =
      suunnitteluVaihe;
    return {
      julkinen,
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      hankkeenKuvaus: adaptHankkeenKuvaus(suunnitteluVaihe.hankkeenKuvaus),
      vuorovaikutukset: adaptVuorovaikutukset(oid, vuorovaikutukset),
      palautteet: palautteet ? palautteet.map((palaute) => ({ __typename: "Palaute", ...palaute })) : undefined,
      palautteidenVastaanottajat,
      __typename: "SuunnitteluVaihe",
    };
  }
  return suunnitteluVaihe as undefined;
}

function adaptVuorovaikutukset(oid: string, vuorovaikutukset: Array<Vuorovaikutus>): API.Vuorovaikutus[] {
  if (vuorovaikutukset && vuorovaikutukset.length > 0) {
    return vuorovaikutukset.map(
      (vuorovaikutus) =>
        ({
          ...vuorovaikutus,
          vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(vuorovaikutus.vuorovaikutusTilaisuudet),
          suunnittelumateriaali: lisaaLinkkiTypename(vuorovaikutus.suunnittelumateriaali),
          videot: lisaaLinkkiTypenameListaan(vuorovaikutus.videot),
          esittelyaineistot: adaptAineistot(vuorovaikutus.esittelyaineistot),
          suunnitelmaluonnokset: adaptAineistot(vuorovaikutus.suunnitelmaluonnokset),
          vuorovaikutusPDFt: adaptVuorovaikutusPDFPaths(oid, vuorovaikutus.vuorovaikutusPDFt),
          __typename: "Vuorovaikutus",
        } as API.Vuorovaikutus)
    );
  }
  return vuorovaikutukset as undefined;
}

function adaptVuorovaikutusTilaisuudet(
  vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuus>
): API.VuorovaikutusTilaisuus[] {
  if (vuorovaikutusTilaisuudet) {
    return vuorovaikutusTilaisuudet.map((vuorovaikutusTilaisuus) => ({
      ...vuorovaikutusTilaisuus,
      esitettavatYhteystiedot: lisaaYhteystietoTypenameListaan(vuorovaikutusTilaisuus.esitettavatYhteystiedot),
      __typename: "VuorovaikutusTilaisuus",
    }));
  }
  return vuorovaikutusTilaisuudet as undefined;
}

function adaptVuorovaikutusPDFPaths(
  oid: string,
  pdfs: LocalizedMap<VuorovaikutusPDF>
): API.VuorovaikutusPDFt | undefined {
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
