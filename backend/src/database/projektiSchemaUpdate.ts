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
import { CloneDeepWithCustomizer } from "lodash";

function isValueArrayOfStrings(value: unknown) {
  return isArray(value) && value.length > 0 && typeof value[0] == "string";
}

type MigrationMatcher = (...[value, key, DBProjekti, stack]: Parameters<MigrationCustomizer>) => boolean;
type MigrationCustomizer = CloneDeepWithCustomizer<DBProjekti>;
type MigrationObj = { matcher: MigrationMatcher; customizer: MigrationCustomizer };

const saameToPohjoissaame: MigrationObj = { matcher: (value) => value === "SAAME", customizer: () => "POHJOISSAAME" };

const kuntaNameToId: MigrationObj = {
  matcher: (_value, key) => key === "kunta",
  customizer: (value) => {
    try {
      return kuntametadata.idForKuntaName(value);
    } catch (e) {
      return 0;
    }
  },
};

const kunnatNameToId: MigrationObj = {
  matcher: (value, key) => key === "kunnat" && isValueArrayOfStrings(value),
  customizer: (value) => {
    try {
      return kuntametadata.idsForKuntaNames(value);
    } catch (e) {
      log.warn(e);
      return [];
    }
  },
};

const maakunnatNameToId: MigrationObj = {
  matcher: (value, key) => key === "maakunnat" && isValueArrayOfStrings(value),
  customizer: (value) => {
    try {
      return kuntametadata.idsForMaakuntaNames(value);
    } catch (e) {
      return [];
    }
  },
};

const nimiToEtunimiAndSukunimi: MigrationObj = {
  matcher: (value, key) => key === "kayttoOikeudet" && value,
  customizer: (value) => {
    const kayttoOikeudet: DBVaylaUser[] = value;
    return kayttoOikeudet.map((user) => {
      if ("nimi" in user) {
        const nimi = (user as unknown as Record<string, string>)["nimi"];
        const [sukunimi, etunimi] = nimi.split(/, /g);
        return { ...user, etunimi, sukunimi };
      }
      return user;
    });
  },
};

const ilmoituksenVastaanottajatNameToId: MigrationObj = {
  matcher: (_value, key) => key === "ilmoituksenVastaanottajat",
  customizer: (value) => {
    const ilmoituksenVastaanottajat: IlmoituksenVastaanottajat = value;
    if (ilmoituksenVastaanottajat.kunnat && ilmoituksenVastaanottajat.kunnat.length > 0) {
      ilmoituksenVastaanottajat.kunnat.forEach((kunta) => {
        if ("nimi" in kunta) {
          (kunta as KuntaVastaanottaja).id = kuntametadata.idForKuntaName((kunta as unknown as Record<string, string>).nimi);
        }
      });
      return ilmoituksenVastaanottajat;
    }
  },
};

const arvioSeuraavanVaiheenAlkamisestaToHaveLocalization: MigrationObj = {
  matcher: (value, key) => "arvioSeuraavanVaiheenAlkamisesta" === key && value && !Object.keys(value).includes("SUOMI"),
  customizer: (value, _key, projekti) => {
    const arvioSeuraavanVaiheenAlkamisesta: LocalizedMap<string> = {
      SUOMI: value,
    };
    if ([projekti?.kielitiedot?.ensisijainenKieli, projekti?.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
      arvioSeuraavanVaiheenAlkamisesta.RUOTSI = value;
    }
    return arvioSeuraavanVaiheenAlkamisesta;
  },
};

const suunnittelunEteneminenJaKestoToHaveLocalization: MigrationObj = {
  matcher: (value, key) => "suunnittelunEteneminenJaKesto" === key && value && !Object.keys(value).includes("SUOMI"),
  customizer: (value, _key, projekti) => {
    const suunnittelunEteneminenJaKesto: LocalizedMap<string> = {
      SUOMI: value,
    };
    if ([projekti?.kielitiedot?.ensisijainenKieli, projekti?.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
      suunnittelunEteneminenJaKesto.RUOTSI = value;
    }
    return suunnittelunEteneminenJaKesto;
  },
};

const videotToHaveLocalization: MigrationObj = {
  matcher: (value, key) => "videot" === key && value,
  customizer: (value, _key, projekti) => {
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
      if ([projekti?.kielitiedot?.ensisijainenKieli, projekti?.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
        multiLangVideo[Kieli.RUOTSI] = video as Linkki;
      }
      return multiLangVideo;
    });
    return videot;
  },
};

const suunnittelumateriaaliToHaveLocalization: MigrationObj = {
  matcher: (value, key) => "suunnittelumateriaali" === key && value && !Object.keys(value).includes("SUOMI"),
  customizer: (value, _key, projekti) => {
    const suunnittelumateriaali: LocalizedMap<Linkki> = {
      SUOMI: value as Linkki,
    };
    if ([projekti?.kielitiedot?.ensisijainenKieli, projekti?.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
      suunnittelumateriaali[Kieli.RUOTSI] = value as Linkki;
    }
    return suunnittelumateriaali;
  },
};

const changeSaapumisohjeetToLisatiedot = (value: (VuorovaikutusTilaisuus & { Saapumisohjeet: VuorovaikutusTilaisuus["lisatiedot"] })[]) =>
  value.map<VuorovaikutusTilaisuus>((tilaisuus) => {
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

const clearSaameValuesFromVuorovaikutusTilaisuus = (vuorovaikutusTilaisuudet: VuorovaikutusTilaisuus[], projekti: DBProjekti | undefined) =>
  cloneDeepWith(vuorovaikutusTilaisuudet, (value, key) => {
    if (["nimi", "paikka", "osoite", "postitoimipaikka", "lisatiedot"].includes(key as string)) {
      if (!value) {
        return undefined;
      }
      if (value && Object.keys(value).includes("SUOMI")) {
        // Remove possible key "SAAME" by not including it
        const valueLokalisoituna: LocalizedMap<string> = {
          SUOMI: value[Kieli.SUOMI],
        };
        if (valueLokalisoituna && Object.keys(value).includes("RUOTSI")) {
          valueLokalisoituna[Kieli.RUOTSI] = value[Kieli.RUOTSI];
        }
        return valueLokalisoituna;
      }
      let kielet: LocalizedMap<string> = {};
      if (kielet) {
        kielet = {
          SUOMI: value,
        };
        if ([projekti?.kielitiedot?.ensisijainenKieli, projekti?.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
          kielet[Kieli.RUOTSI] = value;
        }
      }
      return kielet;
    }
    return undefined;
  });

const saapumisohjeetToLisatiedot: MigrationObj = {
  matcher: (value, key) => "vuorovaikutusTilaisuudet" === key && value,
  customizer: (value, _key, projekti) => {
    let vuorovaikutusTilaisuudet: VuorovaikutusTilaisuus[] | undefined = changeSaapumisohjeetToLisatiedot(value);
    if (vuorovaikutusTilaisuudet) {
      vuorovaikutusTilaisuudet = clearSaameValuesFromVuorovaikutusTilaisuus(vuorovaikutusTilaisuudet, projekti);
    }
    return vuorovaikutusTilaisuudet;
  },
};

const hyvaksymisPaatosVaihePDFtNameChange: MigrationObj = {
  matcher: (value, key) => "hyvaksymisPaatosVaihePDFt" === key && value,
  customizer: (value) => {
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
  },
};

const removeSaameFromLocalizedValues: MigrationObj = {
  matcher: (value) => value && typeof value === "object" && Object.keys(value).includes("SAAME"),
  customizer: (value) => {
    const newValue: LocalizedMap<string> | LocalizedMap<Linkki> = {
      SUOMI: value[Kieli.SUOMI],
    };
    if (Object.keys(value).includes("RUOTSI")) {
      newValue[Kieli.RUOTSI] = value[Kieli.RUOTSI];
    }
    return newValue;
  },
};

const oldToNewSchemaMappers: Record<string, MigrationObj> = {
  saameToPohjoissaame,
  kuntaNameToId,
  kunnatNameToId,
  maakunnatNameToId,
  nimiToEtunimiAndSukunimi,
  ilmoituksenVastaanottajatNameToId,
  arvioSeuraavanVaiheenAlkamisestaToHaveLocalization,
  suunnittelunEteneminenJaKestoToHaveLocalization,
  videotToHaveLocalization,
  suunnittelumateriaaliToHaveLocalization,
  saapumisohjeetToLisatiedot,
  hyvaksymisPaatosVaihePDFtNameChange,
  removeSaameFromLocalizedValues,
};

/**
 * Konvertoi muuttuneet datarakenteet
 * @param projekti
 */
export function migrateFromOldSchema(projekti: DBProjekti): DBProjekti {
  const p: DBProjekti = cloneDeepWith(projekti, (...customizerArgs) =>
    Object.values(oldToNewSchemaMappers)
      .find(({ matcher }) => matcher(...customizerArgs))
      ?.customizer?.(...customizerArgs)
  );
  if (!p.versio) {
    p.versio = 1;
  }
  return p;
}
