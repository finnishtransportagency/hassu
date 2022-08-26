import {
  Palaute,
  SuunnitteluVaihe,
  Vuorovaikutus,
  VuorovaikutusTilaisuus,
  Yhteystieto,
  LocalizedMap,
  VuorovaikutusPDF,
} from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";
import {
  adaptLinkki as lisaaLinkkiTypename,
  adaptLinkkiList as lisaaLinkkiTypenameListaan,
} from "../commonAdapterUtil/lisaaTypename";
import { adaptHankkeenKuvaus } from "../commonAdapterUtil/adaptHankkeenKuvaus";
import { adaptAineistot } from "../commonAdapterUtil/adaptAineistot";
import { adaptYhteystiedot } from "../commonAdapterUtil/adaptYhteystiedot";
import { fileService } from "../../files/fileService";

export default function adaptSuunnitteluVaihe(
  oid: string,
  projektiPaallikko: Yhteystieto,
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
      vuorovaikutukset: adaptVuorovaikutukset(oid, projektiPaallikko, vuorovaikutukset),
      palautteet: palautteet ? palautteet.map((palaute) => ({ __typename: "Palaute", ...palaute })) : undefined,
      palautteidenVastaanottajat,
      __typename: "SuunnitteluVaihe",
    };
  }
  return suunnitteluVaihe as undefined;
}

function adaptVuorovaikutukset(
  oid: string,
  projektiPaallikko: Yhteystieto,
  vuorovaikutukset: Array<Vuorovaikutus>
): API.Vuorovaikutus[] {
  if (vuorovaikutukset && vuorovaikutukset.length > 0) {
    return vuorovaikutukset.map(
      (vuorovaikutus) =>
        ({
          ...vuorovaikutus,
          vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(
            projektiPaallikko,
            vuorovaikutus.vuorovaikutusTilaisuudet
          ),
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
  projektiPaallikko: Yhteystieto,
  vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuus>
): API.VuorovaikutusTilaisuus[] {
  if (vuorovaikutusTilaisuudet) {
    return vuorovaikutusTilaisuudet.map((vuorovaikutusTilaisuus) => ({
      ...vuorovaikutusTilaisuus,
      esitettavatYhteystiedot: adaptYhteystiedot(projektiPaallikko, vuorovaikutusTilaisuus.esitettavatYhteystiedot),
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
