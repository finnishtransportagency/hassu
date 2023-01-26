import {
  Aineisto,
  DBProjekti,
  VuorovaikutusKierros,
  VuorovaikutusTilaisuus,
  Yhteystieto,
  Linkki,
  RequiredLocalizedMap,
  Kielitiedot,
} from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { IllegalArgumentError } from "../../../error/IllegalArgumentError";
import {
  adaptAineistotToSave,
  adaptHankkeenKuvausToSave,
  adaptIlmoituksenVastaanottajatToSave,
  adaptLokalisoituLinkkiToSave,
  adaptLokalisoituTekstiToSave,
  adaptStandardiYhteystiedotToSave,
} from "./common";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import { vaylaUserToYhteystieto } from "../../../util/vaylaUserToYhteystieto";
import mergeWith from "lodash/mergeWith";

export function adaptVuorovaikutusKierrosToSave(
  dbProjekti: DBProjekti,
  vuorovaikutusKierrosInput: API.VuorovaikutusKierrosInput | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): VuorovaikutusKierros | undefined {
  if (vuorovaikutusKierrosInput) {
    const { arvioSeuraavanVaiheenAlkamisesta, suunnittelunEteneminenJaKesto, palautteidenVastaanottajat, hankkeenKuvaus } =
      vuorovaikutusKierrosInput;
    let vuorovaikutusTilaisuudet: VuorovaikutusTilaisuus[] | undefined;

    const dbVuorovaikutusKierros: VuorovaikutusKierros | undefined = dbProjekti.vuorovaikutusKierros || undefined;

    const esittelyaineistot: Aineisto[] | undefined = adaptAineistotToSave(
      dbVuorovaikutusKierros?.esittelyaineistot,
      vuorovaikutusKierrosInput.esittelyaineistot,
      projektiAdaptationResult
    );
    const suunnitelmaluonnokset: Aineisto[] | undefined = adaptAineistotToSave(
      dbVuorovaikutusKierros?.suunnitelmaluonnokset,
      vuorovaikutusKierrosInput.suunnitelmaluonnokset,
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

    const videot: Array<RequiredLocalizedMap<Linkki>> | null =
      (vuorovaikutusKierrosInput.videot?.map((video) => adaptLokalisoituLinkkiToSave(video, kielitiedot)).filter((link) => link) as Array<
        RequiredLocalizedMap<Linkki>
      >) || null;

    const vuorovaikutusKierros: VuorovaikutusKierros = {
      vuorovaikutusNumero: vuorovaikutusKierrosInput.vuorovaikutusNumero,
      esitettavatYhteystiedot: adaptStandardiYhteystiedotToSave(vuorovaikutusKierrosInput.esitettavatYhteystiedot),
      vuorovaikutusTilaisuudet,
      // Jos vuorovaikutuksen ilmoituksella ei tarvitse olla viranomaisvastaanottajia, muokkaa adaptIlmoituksenVastaanottajatToSavea
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(vuorovaikutusKierrosInput.ilmoituksenVastaanottajat),
      esittelyaineistot,
      suunnitelmaluonnokset,
      kysymyksetJaPalautteetViimeistaan: vuorovaikutusKierrosInput.kysymyksetJaPalautteetViimeistaan,
      vuorovaikutusJulkaisuPaiva: vuorovaikutusKierrosInput.vuorovaikutusJulkaisuPaiva,
      videot,
      suunnittelumateriaali: adaptLokalisoituLinkkiToSave(vuorovaikutusKierrosInput.suunnittelumateriaali, kielitiedot),
      arvioSeuraavanVaiheenAlkamisesta: adaptLokalisoituTekstiToSave(arvioSeuraavanVaiheenAlkamisesta, kielitiedot),
      suunnittelunEteneminenJaKesto: adaptLokalisoituTekstiToSave(suunnittelunEteneminenJaKesto, kielitiedot),
      hankkeenKuvaus: adaptHankkeenKuvausToSave(hankkeenKuvaus),
      palautteidenVastaanottajat,
      tila: API.VuorovaikutusKierrosTila.MUOKATTAVISSA,
    };
    return mergeWith(dbProjekti.vuorovaikutusKierros, vuorovaikutusKierros);
  }
  return undefined;
}

export function adaptVuorovaikutusKierrosAfterPerustiedotUpdate(
  dbProjekti: DBProjekti,
  perustiedotInput: API.VuorovaikutusPerustiedotInput | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): VuorovaikutusKierros | undefined {
  if (perustiedotInput) {
    const { arvioSeuraavanVaiheenAlkamisesta, suunnittelunEteneminenJaKesto, palautteidenVastaanottajat, videot, suunnittelumateriaali } =
      perustiedotInput.vuorovaikutusKierros;
    const dbVuorovaikutusKierros: VuorovaikutusKierros | undefined = dbProjekti.vuorovaikutusKierros || undefined;

    const esittelyaineistot: Aineisto[] | undefined = adaptAineistotToSave(
      dbVuorovaikutusKierros?.esittelyaineistot,
      perustiedotInput.vuorovaikutusKierros.esittelyaineistot,
      projektiAdaptationResult
    );
    const suunnitelmaluonnokset: Aineisto[] | undefined = adaptAineistotToSave(
      dbVuorovaikutusKierros?.esittelyaineistot,
      perustiedotInput.vuorovaikutusKierros.suunnitelmaluonnokset,
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

    const vuorovaikutusKierros: VuorovaikutusKierros = {
      vuorovaikutusNumero: perustiedotInput.vuorovaikutusKierros.vuorovaikutusNumero,
      esitettavatYhteystiedot: dbVuorovaikutusKierros?.esitettavatYhteystiedot,
      vuorovaikutusTilaisuudet: dbVuorovaikutusKierros?.vuorovaikutusTilaisuudet,
      ilmoituksenVastaanottajat: dbVuorovaikutusKierros?.ilmoituksenVastaanottajat,
      esittelyaineistot,
      suunnitelmaluonnokset,
      kysymyksetJaPalautteetViimeistaan: perustiedotInput.vuorovaikutusKierros.kysymyksetJaPalautteetViimeistaan,
      vuorovaikutusJulkaisuPaiva: dbVuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva,
      videot: tallennettavatVideot,
      suunnittelumateriaali: adaptLokalisoituLinkkiToSave(suunnittelumateriaali, kielitiedot),
      arvioSeuraavanVaiheenAlkamisesta: adaptLokalisoituTekstiToSave(arvioSeuraavanVaiheenAlkamisesta, kielitiedot),
      suunnittelunEteneminenJaKesto: adaptLokalisoituTekstiToSave(suunnittelunEteneminenJaKesto, kielitiedot),
      hankkeenKuvaus: dbVuorovaikutusKierros?.hankkeenKuvaus,
      palautteidenVastaanottajat,
      tila: dbVuorovaikutusKierros?.tila,
    };
    return vuorovaikutusKierros;
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
    if (!kielitiedot) {
      throw new IllegalArgumentError("adaptVuorovaikutusTilaisuusToSave: kielitiedot puuttuu!");
    }
    if (vv.tyyppi === API.VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) {
      if (!vv.esitettavatYhteystiedot) {
        throw new IllegalArgumentError("Soittoajalla on oltava esitettavatYhteystiedot!");
      }
      vvToSave.esitettavatYhteystiedot = adaptStandardiYhteystiedotToSave(vv.esitettavatYhteystiedot, true);
    } else if (vv.tyyppi === API.VuorovaikutusTilaisuusTyyppi.PAIKALLA) {
      if (!vv.osoite) {
        throw new IllegalArgumentError("Fyysisellä tilaisuudella on oltava osoite!");
      }
      if (!vv.postinumero) {
        throw new IllegalArgumentError("Fyysisellä tilaisuudella on oltava postinumero!");
      }
      vvToSave.osoite = adaptLokalisoituTekstiToSave(vv.osoite, kielitiedot);
      vvToSave.postinumero = vv.postinumero;
      if (vv.Saapumisohjeet) {
        vvToSave.Saapumisohjeet = adaptLokalisoituTekstiToSave(vv.Saapumisohjeet, kielitiedot);
      }
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
    if (vv.nimi) {
      vvToSave.nimi = adaptLokalisoituTekstiToSave(vv.nimi, kielitiedot);
    }
    return vvToSave;
  });
}

export function adaptStandardiYhteystiedotInputToYhteystiedotToSave(
  dbProjekti: DBProjekti,
  kuulutusYhteystiedot: API.StandardiYhteystiedotInput | null | undefined
): Yhteystieto[] {
  const yt: Yhteystieto[] = [];
  const sahkopostit: string[] = [];
  const projari = dbProjekti.kayttoOikeudet.find((oikeus) => oikeus.tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO);
  const kunnanEdustaja = dbProjekti.kayttoOikeudet.find((oikeus) => oikeus.kayttajatunnus === dbProjekti.suunnitteluSopimus?.yhteysHenkilo);
  if (kunnanEdustaja) {
    yt.push(vaylaUserToYhteystieto(kunnanEdustaja, dbProjekti.suunnitteluSopimus));
    sahkopostit.push(kunnanEdustaja.email);
  } else if (projari) {
    yt.push(vaylaUserToYhteystieto(projari, dbProjekti.suunnitteluSopimus));
    sahkopostit.push(projari.email);
  }
  const o = dbProjekti.kayttoOikeudet.filter(
    ({ kayttajatunnus }) =>
      (kunnanEdustaja ? kayttajatunnus !== kunnanEdustaja.kayttajatunnus : projari ? kayttajatunnus !== projari.kayttajatunnus : true) &&
      kuulutusYhteystiedot?.yhteysHenkilot?.find((yh) => yh === kayttajatunnus)
  );
  o.forEach((oikeus) => {
    yt.push(vaylaUserToYhteystieto(oikeus, dbProjekti?.suunnitteluSopimus)); // kunnan edustajalle insertoidaan kunta, jos suunnitteluSopimus on annettu
    sahkopostit.push(oikeus.email); //Kerää sähköpostit myöhempää duplikaattien tarkistusta varten.
  });
  if (kuulutusYhteystiedot?.yhteysTiedot) {
    kuulutusYhteystiedot.yhteysTiedot?.forEach((yhteystieto) => {
      if (!sahkopostit.find((email) => email === yhteystieto.sahkoposti)) {
        //Varmista, ettei ole duplikaatteja
        yt.push({
          ...yhteystieto,
          organisaatio: yhteystieto.organisaatio || "",
          kunta: yhteystieto.kunta || undefined,
          titteli: yhteystieto.titteli || undefined,
        });
        sahkopostit.push(yhteystieto.sahkoposti);
      }
    });
  }
  return yt;
}
