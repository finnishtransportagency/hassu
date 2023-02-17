import {
  DBProjekti,
  DBVaylaUser,
  IlmoituksenVastaanottajat,
  KuntaVastaanottaja,
  Linkki,
  LocalizedMap,
  VuorovaikutusTilaisuus,
} from "./model";
import cloneDeepWith from "lodash/cloneDeepWith";
import { kuntametadata } from "../../../common/kuntametadata";
import { log } from "../logger";
import isArray from "lodash/isArray";
import { Kieli } from "../../../common/graphql/apiModel";

function isValueArrayOfStrings(value: unknown) {
  return isArray(value) && value.length > 0 && typeof value[0] == "string";
}

/**
 * Konvertoi merkkijonomuotoiset kunnat ja maakunnat numeroiksi
 * @param projekti
 */
export function migrateFromOldSchema(projekti: DBProjekti): DBProjekti {
  const p: DBProjekti = cloneDeepWith(projekti, (value, key) => {
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
      if (Object.keys(value).includes("SUOMI")) {
        return undefined;
      }
      let arvioSeuraavanVaiheenAlkamisesta: LocalizedMap<string> = value;
      arvioSeuraavanVaiheenAlkamisesta = {
        SUOMI: value,
      };
      if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
        arvioSeuraavanVaiheenAlkamisesta.RUOTSI = value;
      }
      if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.SAAME)) {
        arvioSeuraavanVaiheenAlkamisesta.SAAME = value;
      }
      return arvioSeuraavanVaiheenAlkamisesta;
    }
    if ("suunnittelunEteneminenJaKesto" == key && value) {
      if (Object.keys(value).includes("SUOMI")) {
        return undefined;
      }
      let suunnittelunEteneminenJaKesto: LocalizedMap<string> = value;
      suunnittelunEteneminenJaKesto = {
        SUOMI: value,
      };
      if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
        suunnittelunEteneminenJaKesto.RUOTSI = value;
      }
      if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.SAAME)) {
        suunnittelunEteneminenJaKesto.SAAME = value;
      }
      return suunnittelunEteneminenJaKesto;
    }
    if ("videot" == key && value) {
      let videot: LocalizedMap<Linkki>[] = value;
      videot = value.map((video: Linkki) => {
        if (Object.keys(video).includes("SUOMI")) {
          return video;
        }
        const multiLangVideo: LocalizedMap<Linkki> = {
          SUOMI: video as Linkki,
        };
        if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
          multiLangVideo[Kieli.RUOTSI] = video as Linkki;
        }
        if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.SAAME)) {
          multiLangVideo[Kieli.SAAME] = video as Linkki;
        }
        return multiLangVideo;
      });
      return videot;
    }
    if ("suunnittelumateriaali" == key && value) {
      if (Object.keys(value).includes("SUOMI")) {
        return undefined;
      }
      let suunnittelumateriaali: LocalizedMap<Linkki> = value;
      suunnittelumateriaali = {
        SUOMI: value as Linkki,
      };
      if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
        suunnittelumateriaali[Kieli.RUOTSI] = value as Linkki;
      }
      if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.SAAME)) {
        suunnittelumateriaali[Kieli.SAAME] = value as Linkki;
      }
      return suunnittelumateriaali;
    }
    if ("vuorovaikutusTilaisuudet" == key && value) {
      if (Object.keys(value).includes("SUOMI")) {
        return undefined;
      }
      let vuorovaikutusTilaisuudet: VuorovaikutusTilaisuus[] = value;
      if (vuorovaikutusTilaisuudet) {
        vuorovaikutusTilaisuudet = cloneDeepWith(value, (value2, key2) => {
          if (["nimi", "paikka", "osoite", "postitoimipaikka", "Saapumisohje"].includes(key2 as string)) {
            if (value2 == null || Object.keys(value2).includes("SUOMI")) {
              return undefined;
            }
            let something: LocalizedMap<string> = value2;
            if (something) {
              something = {
                SUOMI: value2,
              };
              if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
                something[Kieli.RUOTSI] = value2;
              }
              if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.SAAME)) {
                something[Kieli.SAAME] = value2;
              }
            }
            return something;
          }
          return undefined;
        });
      }
      return vuorovaikutusTilaisuudet;
    }
    return undefined;
  });
  if (!p.versio) {
    p.versio = 1;
  }
  return p;
}
