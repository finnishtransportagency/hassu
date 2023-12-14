import {
  DBProjekti,
  DBVaylaUser,
  IlmoituksenVastaanottajat,
  KuntaVastaanottaja,
  Linkki,
  LocalizedMap,
  VuorovaikutusKierros,
  VuorovaikutusTilaisuus,
} from "./model";
import cloneDeepWith from "lodash/cloneDeepWith";
import { kuntametadata } from "hassu-common/kuntametadata";
import { VuorovaikutusAineistoKategoria } from "hassu-common/vuorovaikutusAineistoKategoria";
import { log } from "../logger";
import isArray from "lodash/isArray";
import { Kieli } from "hassu-common/graphql/apiModel";

function isValueArrayOfStrings(value: unknown) {
  return isArray(value) && value.length > 0 && typeof value[0] == "string";
}

/**
 * Konvertoi merkkijonomuotoiset kunnat ja maakunnat numeroiksi
 * @param projekti
 */
export function migrateFromOldSchema(projekti: DBProjekti): DBProjekti {
  const p: DBProjekti = cloneDeepWith(projekti, (value, key) => {
    if (value === "SAAME") {
      return "POHJOISSAAME";
    }
    if (key == "kunta") {
      try {
        return kuntametadata.idForKuntaName(value);
      } catch (e) {
        return 0;
      }
    }
    if (key == "kunnat" && isValueArrayOfStrings(value)) {
      try {
        return kuntametadata.idsForKuntaNames(value);
      } catch (e) {
        log.warn(e);
        return [];
      }
    }
    if (key == "maakunnat" && isValueArrayOfStrings(value)) {
      try {
        return kuntametadata.idsForMaakuntaNames(value);
      } catch (e) {
        return [];
      }
    }
    if (key == "kayttoOikeudet" && value) {
      const kayttoOikeudet: DBVaylaUser[] = value;
      return kayttoOikeudet.map((user) => {
        if ("nimi" in user) {
          const nimi = (user as unknown as Record<string, string>)["nimi"];
          const [sukunimi, etunimi] = nimi.split(/, /g);
          return { ...user, etunimi, sukunimi };
        }
        return user;
      });
    }
    if (key == "ilmoituksenVastaanottajat") {
      const ilmoituksenVastaanottajat: IlmoituksenVastaanottajat = value;
      if (ilmoituksenVastaanottajat.kunnat && ilmoituksenVastaanottajat.kunnat.length > 0) {
        ilmoituksenVastaanottajat.kunnat.forEach((kunta) => {
          if ("nimi" in kunta) {
            (kunta as KuntaVastaanottaja).id = kuntametadata.idForKuntaName((kunta as unknown as Record<string, string>).nimi);
          }
        });
        return ilmoituksenVastaanottajat;
      }
    }
    if ("arvioSeuraavanVaiheenAlkamisesta" == key && value) {
      if (!Object.keys(value).includes("SUOMI")) {
        const arvioSeuraavanVaiheenAlkamisesta: LocalizedMap<string> = {
          SUOMI: value,
        };
        if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
          arvioSeuraavanVaiheenAlkamisesta.RUOTSI = value;
        }
        return arvioSeuraavanVaiheenAlkamisesta;
      }
    }

    if ("suunnittelunEteneminenJaKesto" == key && value) {
      if (!Object.keys(value).includes("SUOMI")) {
        const suunnittelunEteneminenJaKesto: LocalizedMap<string> = {
          SUOMI: value,
        };
        if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
          suunnittelunEteneminenJaKesto.RUOTSI = value;
        }
        return suunnittelunEteneminenJaKesto;
      }
    }
    if ("videot" == key && value) {
      const videot: LocalizedMap<Linkki>[] = value.map((video: Linkki | LocalizedMap<Linkki>) => {
        if (video && Object.keys(video).includes("SUOMI")) {
          // Remove possible key "SAAME" by not including it
          const videoLokalisoituna: LocalizedMap<Linkki> = video as LocalizedMap<Linkki>;
          const newVideo: LocalizedMap<Linkki> = {
            [Kieli.SUOMI]: videoLokalisoituna?.[Kieli.SUOMI] || undefined,
          };
          if (videoLokalisoituna && Object.keys(videoLokalisoituna).includes("RUOTSI")) {
            newVideo[Kieli.RUOTSI] = videoLokalisoituna[Kieli.RUOTSI];
          }
          return newVideo;
        }
        const multiLangVideo: LocalizedMap<Linkki> = {
          SUOMI: video as Linkki,
        };
        if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
          multiLangVideo[Kieli.RUOTSI] = video as Linkki;
        }
        return multiLangVideo;
      });
      return videot;
    }
    if ("suunnittelumateriaali" == key && value) {
      let newValue = value;

      if (!Array.isArray(newValue) && !Object.keys(value).includes("SUOMI")) {
        newValue = {
          SUOMI: value as Linkki,
        };
        if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
          newValue[Kieli.RUOTSI] = value as Linkki;
        }
      }
      if (newValue["SAAME"]) {
        delete newValue.SAAME;
      }
      if (!Array.isArray(newValue)) {
        newValue = [newValue];
      }
      return newValue;
    }
    if ("vuorovaikutusTilaisuudet" == key && value) {
      let vuorovaikutusTilaisuudet: VuorovaikutusTilaisuus[] = value.map((tilaisuus: Record<string, any>) => {
        if (Object.keys(tilaisuus).includes("Saapumisohjeet")) {
          const { Saapumisohjeet, ...rest } = tilaisuus;
          return {
            ...rest,
            lisatiedot: Saapumisohjeet,
          };
        } else {
          return tilaisuus;
        }
      });
      if (vuorovaikutusTilaisuudet) {
        vuorovaikutusTilaisuudet = cloneDeepWith(vuorovaikutusTilaisuudet, (value2, key2) => {
          if (["nimi", "paikka", "osoite", "postitoimipaikka", "lisatiedot"].includes(key2 as string)) {
            if (!value2) {
              return undefined;
            }
            if (value2 && Object.keys(value2).includes("SUOMI")) {
              // Remove possible key "SAAME" by not including it
              const valueLokalisoituna: LocalizedMap<string> = {
                SUOMI: value2[Kieli.SUOMI],
              };
              if (valueLokalisoituna && Object.keys(value2).includes("RUOTSI")) {
                valueLokalisoituna[Kieli.RUOTSI] = value2[Kieli.RUOTSI];
              }
              return valueLokalisoituna;
            }
            let something: LocalizedMap<string> = {};
            if (something) {
              something = {
                SUOMI: value2,
              };
              if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
                something[Kieli.RUOTSI] = value2;
              }
            }
            return something;
          }
          return undefined;
        });
      }
      return vuorovaikutusTilaisuudet;
    }
    if ("hyvaksymisPaatosVaihePDFt" == key && value) {
      ["SUOMI", "RUOTSI"].forEach((kieli) => {
        delete value.SAAME; //In this "if", there is no fall-through, so we delete possible SAAME here.
        if (value[kieli]) {
          if (value[kieli].ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath) {
            value[kieli].ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath =
              value[kieli].ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath;
            delete value[kieli].ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath;
          }
          if (value[kieli].ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath) {
            value[kieli].ilmoitusHyvaksymispaatoskuulutuksestaPDFPath =
              value[kieli].ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath;
            delete value[kieli].ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath;
          }
        }
      });
      return value;
    }
    if ("euRahoitusLogot" == key && value?.logoFI) {
      const { logoFI, logoSV, ...rest } = value;
      const returned = {
        SUOMI: logoFI,
        ...rest,
      };
      if (projekti.kielitiedot?.toissijainenKieli == Kieli.RUOTSI) {
        returned.RUOTSI = logoSV;
      }
      return returned;
    }
    if ("logo" == key && value && !value.SUOMI) {
      const returned: LocalizedMap<string> = {
        SUOMI: value,
      };
      if (projekti.kielitiedot?.toissijainenKieli == Kieli.RUOTSI) {
        returned.RUOTSI = value;
      }
      return returned;
    }
    if (value && typeof value === "object" && Object.keys(value).includes("SAAME")) {
      const newValue: LocalizedMap<string> | LocalizedMap<Linkki> = {
        SUOMI: value[Kieli.SUOMI],
      };
      if (value && Object.keys(value).includes("RUOTSI")) {
        newValue[Kieli.RUOTSI] = value[Kieli.RUOTSI];
      }
      return newValue;
    }
    return undefined;
  });
  if (!p.versio) {
    p.versio = 1;
  }
  p.aloitusKuulutusJulkaisut?.forEach((julkaisu) => {
    if (!julkaisu.kuulutusYhteystiedot) {
      julkaisu.kuulutusYhteystiedot = {
        yhteysTiedot: julkaisu.yhteystiedot,
        yhteysHenkilot: [],
      };
    }
  });

  p.vuorovaikutusKierrosJulkaisut?.forEach((julkaisu) => {
    if (!julkaisu.esitettavatYhteystiedot) {
      julkaisu.esitettavatYhteystiedot = {
        yhteysTiedot: julkaisu.yhteystiedot || [],
        yhteysHenkilot: [],
      };
    }
    if (!julkaisu.yhteystiedot) {
      julkaisu.yhteystiedot = [];
    }
  });
  p.nahtavillaoloVaiheJulkaisut?.forEach((julkaisu) => {
    if (!julkaisu.kuulutusYhteystiedot) {
      julkaisu.kuulutusYhteystiedot = {
        yhteysTiedot: julkaisu.yhteystiedot,
        yhteysHenkilot: [],
      };
    }
  });

  p.hyvaksymisPaatosVaiheJulkaisut?.forEach((julkaisu) => {
    if (!julkaisu.kuulutusYhteystiedot) {
      julkaisu.kuulutusYhteystiedot = {
        yhteysTiedot: julkaisu.yhteystiedot,
        yhteysHenkilot: [],
      };
    }
  });

  p.jatkoPaatos1VaiheJulkaisut?.forEach((julkaisu) => {
    if (!julkaisu.kuulutusYhteystiedot) {
      julkaisu.kuulutusYhteystiedot = {
        yhteysTiedot: julkaisu.yhteystiedot,
        yhteysHenkilot: [],
      };
    }
  });

  p.jatkoPaatos2VaiheJulkaisut?.forEach((julkaisu) => {
    if (!julkaisu.kuulutusYhteystiedot) {
      julkaisu.kuulutusYhteystiedot = {
        yhteysTiedot: julkaisu.yhteystiedot,
        yhteysHenkilot: [],
      };
    }
  });

  updateVuorovaikutusAineistot(p);

  return p;
}

function updateVuorovaikutusAineistot(p: DBProjekti) {
  if (p.vuorovaikutusKierros && !p.vuorovaikutusKierros?.aineistot) {
    const esittelyaineistot: VuorovaikutusKierros["aineistot"] = (p.vuorovaikutusKierros as any)?.["esittelyaineistot"];
    const suunnitelmaluonnokset: VuorovaikutusKierros["aineistot"] = (p.vuorovaikutusKierros as any)?.["suunnitelmaluonnokset"];

    if (esittelyaineistot || suunnitelmaluonnokset) {
      p.vuorovaikutusKierros.aineistot = combineEsittelyAineistotAndSuunnitelmaluonnokset(esittelyaineistot, suunnitelmaluonnokset);
    }
  }

  p.vuorovaikutusKierrosJulkaisut?.forEach((julkaisu) => {
    if (!julkaisu?.aineistot) {
      const esittelyaineistot: VuorovaikutusKierros["aineistot"] = (julkaisu as any)?.["esittelyaineistot"];
      const suunnitelmaluonnokset: VuorovaikutusKierros["aineistot"] = (julkaisu as any)?.["suunnitelmaluonnokset"];

      if (esittelyaineistot || suunnitelmaluonnokset) {
        julkaisu.aineistot = combineEsittelyAineistotAndSuunnitelmaluonnokset(esittelyaineistot, suunnitelmaluonnokset);
      }
    }
  });
}

function combineEsittelyAineistotAndSuunnitelmaluonnokset(
  esittelyaineistot: VuorovaikutusKierros["aineistot"],
  suunnitelmaluonnokset: VuorovaikutusKierros["aineistot"]
): VuorovaikutusKierros["aineistot"] {
  const esittelyaineistoKategorisoitu =
    esittelyaineistot?.map((aineisto) => ({
      ...aineisto,
      kategoriaId: VuorovaikutusAineistoKategoria.ESITTELYAINEISTO,
    })) ?? [];
  const suunnitelmaluonnoksetKategorisoitu =
    suunnitelmaluonnokset?.map((aineisto) => ({
      ...aineisto,
      kategoriaId: VuorovaikutusAineistoKategoria.SUUNNITELMALUONNOS,
    })) ?? [];
  return [...esittelyaineistoKategorisoitu, ...suunnitelmaluonnoksetKategorisoitu];
}
