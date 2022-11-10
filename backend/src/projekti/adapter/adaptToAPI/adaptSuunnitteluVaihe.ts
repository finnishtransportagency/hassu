import {
  DBProjekti,
  DBVaylaUser,
  LocalizedMap,
  StandardiYhteystiedot,
  SuunnitteluVaihe,
  Vuorovaikutus,
  VuorovaikutusPDF,
  VuorovaikutusTilaisuus,
} from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { SuunnitteluVaiheTila } from "../../../../../common/graphql/apiModel";
import {
  adaptAineistot,
  adaptHankkeenKuvaus,
  adaptIlmoituksenVastaanottajat,
  adaptLinkkiByAddingTypename,
  adaptLinkkiListByAddingTypename,
  adaptStandardiYhteystiedotByAddingProjektiPaallikko,
  adaptStandardiYhteystiedotByAddingTypename,
} from "../common";
import { fileService } from "../../../files/fileService";
import { cloneDeep } from "lodash";

export function adaptSuunnitteluVaihe(
  dbProjekti: DBProjekti,
  kayttoOikeudet: DBVaylaUser[],
  suunnitteluVaihe: SuunnitteluVaihe | null | undefined,
  vuorovaikutukset: Array<Vuorovaikutus> | null | undefined
): API.SuunnitteluVaihe | undefined {
  if (suunnitteluVaihe) {
    const { hankkeenKuvaus, tila, arvioSeuraavanVaiheenAlkamisesta, suunnittelunEteneminenJaKesto, palautteidenVastaanottajat } =
      suunnitteluVaihe;
    if (tila == SuunnitteluVaiheTila.MIGROITU) {
      return { __typename: "SuunnitteluVaihe", tila };
    }
    if (!hankkeenKuvaus) {
      throw new Error("adaptSuunnitteluVaihe: suunnitteluvaihe.hankkeenKuvaus määrittelemättä");
    }
    return {
      tila,
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
      vuorovaikutukset: adaptVuorovaikutukset(dbProjekti, kayttoOikeudet, vuorovaikutukset),
      palautteidenVastaanottajat,
      __typename: "SuunnitteluVaihe",
    };
  }
  return suunnitteluVaihe as undefined;
}

function adaptVuorovaikutukset(
  projekti: DBProjekti,
  kayttoOikeudet: DBVaylaUser[],
  vuorovaikutukset: Array<Vuorovaikutus> | undefined | null
): API.Vuorovaikutus[] | undefined {
  if (vuorovaikutukset && vuorovaikutukset.length > 0) {
    const vuorovaikutuksetCopy = cloneDeep(vuorovaikutukset);
    return vuorovaikutuksetCopy.map((vuorovaikutus) => {
      if (!vuorovaikutus.ilmoituksenVastaanottajat) {
        throw new Error("adaptVuorovaikutukset: vuorovaikutus.ilmoituksenVastaanottajat määrittelemättä");
      }
      if (!vuorovaikutus.vuorovaikutusTilaisuudet) {
        throw new Error("adaptVuorovaikutukset: vuorovaikutus.vuorovaikutusTilaisuudet määrittelemättä");
      }
      const vuorovaikutusPDFt = vuorovaikutus.vuorovaikutusPDFt;
      delete vuorovaikutus.vuorovaikutusPDFt;
      const apiVuorovaikutus: API.Vuorovaikutus = {
        ...(vuorovaikutus as Omit<Vuorovaikutus, "vuorovaikutusPDFt">),
        ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(vuorovaikutus.ilmoituksenVastaanottajat),
        esitettavatYhteystiedot: adaptStandardiYhteystiedotByAddingProjektiPaallikko(
          kayttoOikeudet,
          vuorovaikutus.esitettavatYhteystiedot,
          projekti.suunnitteluSopimus
        ),
        vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(vuorovaikutus.vuorovaikutusTilaisuudet),
        suunnittelumateriaali: adaptLinkkiByAddingTypename(vuorovaikutus.suunnittelumateriaali),
        videot: adaptLinkkiListByAddingTypename(vuorovaikutus.videot),
        esittelyaineistot: adaptAineistot(vuorovaikutus.esittelyaineistot),
        suunnitelmaluonnokset: adaptAineistot(vuorovaikutus.suunnitelmaluonnokset),
        __typename: "Vuorovaikutus",
      };

      if (vuorovaikutusPDFt) {
        apiVuorovaikutus.vuorovaikutusPDFt = adaptVuorovaikutusPDFPaths(projekti.oid, vuorovaikutusPDFt);
      }
      return apiVuorovaikutus;
    });
  }
  return vuorovaikutukset as undefined;
}

function adaptVuorovaikutusTilaisuudet(
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
        tilaisuus.esitettavatYhteystiedot = adaptStandardiYhteystiedotByAddingTypename(esitettavatYhteystiedot);
      }
      return tilaisuus;
    });
  }
  return vuorovaikutusTilaisuudet as undefined;
}

function adaptVuorovaikutusPDFPaths(oid: string, vuorovaikutusPdfs: LocalizedMap<VuorovaikutusPDF>): API.VuorovaikutusPDFt | undefined {
  if (!vuorovaikutusPdfs) {
    return undefined;
  }

  const result: { [Kieli: string]: API.VuorovaikutusPDF } = {};
  for (const kieli in vuorovaikutusPdfs) {
    const pdfs = vuorovaikutusPdfs[kieli as API.Kieli];
    if (pdfs) {
      result[kieli] = {
        __typename: "VuorovaikutusPDF",
        // getYllapitoPathForProjektiFile molemmat argumentit on määritelty, joten funktio palauttaa ei-undefined arvon
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        kutsuPDFPath: fileService.getYllapitoPathForProjektiFile(oid, pdfs.kutsuPDFPath),
      };
    }
  }
  return { __typename: "VuorovaikutusPDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
}
