import {
  DBProjekti,
  Kielitiedot,
  Linkki,
  RequiredLocalizedMap,
  VuorovaikutusKierros,
  VuorovaikutusKutsuSaamePDFt,
  VuorovaikutusTilaisuus,
  Yhteystieto,
} from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { VuorovaikutusKutsuSaamePDFtInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import {
  adaptAineistotToSave,
  adaptHankkeenKuvausToSave,
  adaptIlmoituksenVastaanottajatToSave,
  adaptLadattuTiedostoToSave,
  adaptLokalisoidutLinkitToSave,
  adaptLokalisoituLinkkiToSave,
  adaptLokalisoituTekstiToSave,
  adaptStandardiYhteystiedotToSave,
} from "./common";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import { vaylaUserToYhteystieto } from "../../../util/vaylaUserToYhteystieto";
import mergeWith from "lodash/mergeWith";
import { yhteystietoInputToDBYhteystieto } from "../../../util/yhteystietoInputToDBYhteystieto";
import { assertIsDefined } from "../../../util/assertions";
import { forEverySaameDo } from "../common";
import pickBy from "lodash/pickBy";
import { preventArrayMergingCustomizer } from "../../../util/preventArrayMergingCustomizer";
import { yhdistaVuorovaikutusAineistot } from "hassu-common/vuorovaikutusAineistoKategoria";

export function adaptVuorovaikutusKierrosToSave(
  dbProjekti: DBProjekti,
  vuorovaikutusKierrosInput: API.VuorovaikutusKierrosInput | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): VuorovaikutusKierros | undefined {
  if (vuorovaikutusKierrosInput) {
    const {
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      palautteidenVastaanottajat,
      hankkeenKuvaus,
      esittelyaineistot,
      suunnitelmaluonnokset,
    } = vuorovaikutusKierrosInput;
    let vuorovaikutusTilaisuudet: VuorovaikutusTilaisuus[] | undefined;

    const dbVuorovaikutusKierros: VuorovaikutusKierros | undefined = dbProjekti.vuorovaikutusKierros ?? undefined;

    const aineistot = adaptAineistotToSave(
      dbVuorovaikutusKierros?.aineistot,
      yhdistaVuorovaikutusAineistot({ esittelyaineistot, suunnitelmaluonnokset }),
      projektiAdaptationResult
    );

    if (vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet) {
      vuorovaikutusTilaisuudet = adaptVuorovaikutusTilaisuudetToSave(
        vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet,
        dbProjekti.kielitiedot
      );
    }

    const kielitiedot = dbProjekti.kielitiedot;

    if (!kielitiedot) {
      throw new Error("adaptVuorovaikutusKierrosToSave: dbProjekti.kielitiedot puuttuu");
    }

    const videot: Array<RequiredLocalizedMap<Linkki>> | null | undefined = vuorovaikutusKierrosInput.videot
      ? (vuorovaikutusKierrosInput.videot.map((video) => adaptLokalisoituLinkkiToSave(video, kielitiedot)).filter((link) => link) as Array<
          RequiredLocalizedMap<Linkki>
        >)
      : dbProjekti?.vuorovaikutusKierros?.videot;

    const vuorovaikutusKierros: VuorovaikutusKierros = removeUndefinedFields({
      vuorovaikutusNumero: vuorovaikutusKierrosInput.vuorovaikutusNumero,
      esitettavatYhteystiedot: adaptStandardiYhteystiedotToSave(vuorovaikutusKierrosInput.esitettavatYhteystiedot),
      vuorovaikutusTilaisuudet,
      // Jos vuorovaikutuksen ilmoituksella ei tarvitse olla viranomaisvastaanottajia, muokkaa adaptIlmoituksenVastaanottajatToSavea
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(vuorovaikutusKierrosInput.ilmoituksenVastaanottajat),
      aineistot,
      kysymyksetJaPalautteetViimeistaan: vuorovaikutusKierrosInput.kysymyksetJaPalautteetViimeistaan,
      vuorovaikutusJulkaisuPaiva: vuorovaikutusKierrosInput.vuorovaikutusJulkaisuPaiva,
      videot,
      suunnittelumateriaali: adaptLokalisoidutLinkitToSave(vuorovaikutusKierrosInput.suunnittelumateriaali, kielitiedot),
      arvioSeuraavanVaiheenAlkamisesta: adaptLokalisoituTekstiToSave(arvioSeuraavanVaiheenAlkamisesta, kielitiedot),
      suunnittelunEteneminenJaKesto: adaptLokalisoituTekstiToSave(suunnittelunEteneminenJaKesto, kielitiedot),
      hankkeenKuvaus: adaptHankkeenKuvausToSave(hankkeenKuvaus),
      palautteidenVastaanottajat,
      tila: API.VuorovaikutusKierrosTila.MUOKATTAVISSA,
      vuorovaikutusSaamePDFt: adaptVuorovaikutusSaamePDFt(
        dbVuorovaikutusKierros?.vuorovaikutusSaamePDFt,
        vuorovaikutusKierrosInput.vuorovaikutusSaamePDFt
      ),
      selosteVuorovaikutuskierrokselle: vuorovaikutusKierrosInput.selosteVuorovaikutuskierrokselle,
    });
    return mergeWith({}, dbProjekti.vuorovaikutusKierros, vuorovaikutusKierros, preventArrayMergingCustomizer);
  }
  return undefined;
}

function removeUndefinedFields(object: VuorovaikutusKierros): VuorovaikutusKierros {
  return {
    vuorovaikutusNumero: object.vuorovaikutusNumero,
    ...pickBy(object, (value) => value !== undefined),
  };
}

export function adaptVuorovaikutusKierrosAfterPerustiedotUpdate(
  dbProjekti: DBProjekti,
  perustiedotInput: API.VuorovaikutusPerustiedotInput | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): VuorovaikutusKierros | undefined {
  if (perustiedotInput) {
    const {
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      palautteidenVastaanottajat,
      videot,
      suunnittelumateriaali,
      esittelyaineistot,
      suunnitelmaluonnokset,
    } = perustiedotInput.vuorovaikutusKierros;
    const dbVuorovaikutusKierros: VuorovaikutusKierros | undefined = dbProjekti.vuorovaikutusKierros ?? undefined;

    const aineistot = adaptAineistotToSave(
      dbVuorovaikutusKierros?.aineistot,
      yhdistaVuorovaikutusAineistot({
        esittelyaineistot,
        suunnitelmaluonnokset,
      }),
      projektiAdaptationResult
    );

    const kielitiedot = dbProjekti.kielitiedot;

    if (!kielitiedot) {
      throw new Error("adaptVuorovaikutusKierrosToSave: dbProjekti.kielitiedot puuttuu");
    }

    const tallennettavatVideot: Array<RequiredLocalizedMap<Linkki>> | null =
      (videot?.map((video) => adaptLokalisoituLinkkiToSave(video, kielitiedot)).filter((link) => link) as Array<
        RequiredLocalizedMap<Linkki>
      >) || null;

    const vuorovaikutus: VuorovaikutusKierros = removeUndefinedFields({
      vuorovaikutusNumero: perustiedotInput.vuorovaikutusKierros.vuorovaikutusNumero,
      aineistot,
      kysymyksetJaPalautteetViimeistaan: perustiedotInput.vuorovaikutusKierros.kysymyksetJaPalautteetViimeistaan,
      videot: tallennettavatVideot,
      suunnittelumateriaali: adaptLokalisoidutLinkitToSave(suunnittelumateriaali, kielitiedot),
      arvioSeuraavanVaiheenAlkamisesta: adaptLokalisoituTekstiToSave(arvioSeuraavanVaiheenAlkamisesta, kielitiedot),
      suunnittelunEteneminenJaKesto: adaptLokalisoituTekstiToSave(suunnittelunEteneminenJaKesto, kielitiedot),
      hankkeenKuvaus: dbVuorovaikutusKierros?.hankkeenKuvaus,
      palautteidenVastaanottajat,
    });
    return mergeWith({}, dbVuorovaikutusKierros, vuorovaikutus, preventArrayMergingCustomizer);
  }
  return undefined;
}

function adaptVuorovaikutusTilaisuudetToSave(
  vuorovaikutusTilaisuudet: Array<API.VuorovaikutusTilaisuusInput>,
  kielitiedot: Kielitiedot | null | undefined
): VuorovaikutusTilaisuus[] {
  return vuorovaikutusTilaisuudet.map((vv) => {
    const vvToSave: VuorovaikutusTilaisuus = {
      paivamaara: vv.paivamaara,
      alkamisAika: vv.alkamisAika,
      paattymisAika: vv.paattymisAika,
      tyyppi: vv.tyyppi,
    };
    assertIsDefined(kielitiedot, "adaptVuorovaikutusTilaisuusToSave: kielitiedot puuttuu!");
    if (vv.tyyppi === API.VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) {
      if (!vv.esitettavatYhteystiedot) {
        throw new IllegalArgumentError("Soittoajalla on oltava esitettavatYhteystiedot!");
      }
      vvToSave.esitettavatYhteystiedot = adaptStandardiYhteystiedotToSave(vv.esitettavatYhteystiedot, true);
    } else if (vv.tyyppi === API.VuorovaikutusTilaisuusTyyppi.PAIKALLA) {
      if (!vv.osoite) {
        throw new IllegalArgumentError("Yleisötilaisuudella on oltava osoite!");
      }
      if (!vv.postinumero) {
        throw new IllegalArgumentError("Yleisötilaisuudella on oltava postinumero!");
      }
      vvToSave.osoite = adaptLokalisoituTekstiToSave(vv.osoite, kielitiedot);
      vvToSave.postinumero = vv.postinumero;
      if (vv.paikka) {
        vvToSave.paikka = adaptLokalisoituTekstiToSave(vv.paikka, kielitiedot);
      }
      if (vv.postitoimipaikka) {
        vvToSave.postitoimipaikka = adaptLokalisoituTekstiToSave(vv.postitoimipaikka, kielitiedot);
      }
    } else {
      if (!vv.linkki) {
        throw new IllegalArgumentError("Online-tilaisuudella on oltava linkki!");
      }
      if (!vv.kaytettavaPalvelu) {
        throw new IllegalArgumentError("Online-tilaisuudella on oltava kaytettavaPalvelu!");
      }
      vvToSave.linkki = vv.linkki;
      vvToSave.kaytettavaPalvelu = vv.kaytettavaPalvelu;
    }
    if (vv.lisatiedot !== undefined) {
      vvToSave.lisatiedot = adaptLokalisoituTekstiToSave(vv.lisatiedot, kielitiedot);
    }
    if (vv.nimi !== undefined) {
      vvToSave.nimi = adaptLokalisoituTekstiToSave(vv.nimi, kielitiedot);
    }
    return vvToSave;
  });
}

export function adaptStandardiYhteystiedotInputToYhteystiedotToSave(
  dbProjekti: DBProjekti,
  kuulutusYhteystiedot: API.StandardiYhteystiedotInput | null | undefined
): Yhteystieto[] {
  const henkiloYhteystiedot = dbProjekti.kayttoOikeudet
    .filter(({ kayttajatunnus }) => kuulutusYhteystiedot?.yhteysHenkilot?.some((yh) => yh === kayttajatunnus))
    .map((oikeus) => vaylaUserToYhteystieto(oikeus, dbProjekti?.suunnitteluSopimus));
  const yhteystiedot = kuulutusYhteystiedot?.yhteysTiedot?.map((yhteystieto) => yhteystietoInputToDBYhteystieto(yhteystieto)) || [];
  return [...henkiloYhteystiedot, ...yhteystiedot];
}

function adaptVuorovaikutusSaamePDFt(
  dbPDFt: VuorovaikutusKutsuSaamePDFt | null | undefined,
  inputPDFt: VuorovaikutusKutsuSaamePDFtInput | null | undefined
): VuorovaikutusKutsuSaamePDFt | null | undefined {
  if (!inputPDFt) {
    return dbPDFt;
  }
  let result: VuorovaikutusKutsuSaamePDFt | null | undefined = dbPDFt;
  if (!result) {
    result = {};
  }
  forEverySaameDo((kieli) => {
    assertIsDefined(result);
    assertIsDefined(inputPDFt);
    result[kieli] = adaptLadattuTiedostoToSave(result[kieli], inputPDFt[kieli]);
  });
  return result;
}
