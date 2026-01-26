import {
  Aineisto,
  DBProjekti,
  DBVaylaUser,
  IlmoituksenVastaanottajat,
  KuntaVastaanottaja,
  LausuntoPyynto,
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
import { Kieli, LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { nyt } from "../util/dateUtil";
import { uuid } from "hassu-common/util/uuid";

function isValueArrayOfStrings(value: unknown) {
  return isArray(value) && value.length > 0 && typeof value[0] == "string";
}

/**
 * Konvertoi vanhanmuotoisen projektidatan uudenmuotoiseksi
 * @param projekti
 */
export function migrateFromOldSchema(projekti: DBProjekti, isUpgradeDatabase = false): DBProjekti {
  const projektiAsAny: any = projekti as any;
  const lausuntoPyynnot = projekti.lausuntoPyynnot ?? [];
  const nahtavillaoloVaiheJulkaisut = projektiAsAny["nahtavillaoloVaiheJulkaisut"];

  // 1. Korvaa vanhat nähtävilläolojulkaisujen lausuntopyynnöt
  nahtavillaoloVaiheJulkaisut?.map((julkaisu: any) => {
    const lisaAineisto = julkaisu["lisaAineisto"];
    if (lisaAineisto && !lausuntoPyynnot?.some((pyynto) => pyynto.legacy === julkaisu.id)) {
      const legacyLausuntoPyynto: LausuntoPyynto = {
        uuid: uuid.v4(),
        poistumisPaiva: nyt().add(180, "day").format("YYYY-MM-DD"),
        lisaAineistot: [...lisaAineisto].map((aineisto) => {
          const { dokumenttiOid: _d, tiedosto, jarjestys, tila: _t, ...rest } = aineisto;
          return {
            ...rest,
            tiedosto: tiedosto ?? "",
            jarjestys: jarjestys ?? 0,
            tila: LadattuTiedostoTila.VALMIS,
          };
        }),
        legacy: julkaisu.id,
        aineistopaketti: julkaisu["aineistopaketti"],
      };
      lausuntoPyynnot.push(legacyLausuntoPyynto);
    }
  });

  const p: DBProjekti = cloneDeepWith(projektiAsAny, (value, key) => {
    // 2. Kaikkien SAAME kieliarvojen vaihtaminen POHJOISSAAME:ksi
    if (value === "SAAME") {
      return "POHJOISSAAME";
    }

    // 3. Korvaa kunnat ja maakunnat
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

    // 4. Korvaa nimi etunimi ja sukunimi kentillä
    if (key == "kayttoOikeudet" && value) {
      const kayttoOikeudet: DBVaylaUser[] = value;
      return kayttoOikeudet.map((user) => {
        if ("nimi" in user) {
          const { nimi, ...rest } = user as unknown as Record<string, string>;
          const [sukunimi, etunimi] = nimi.split(/, /g);
          return { ...rest, etunimi, sukunimi };
        }
        return user;
      });
    }

    // 5. Korvaa kunnan nimi kenttä kunnan id kentällä ilmoituksenvastaanottajissa
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

    // 6. Korvaa nykyisin lokalisoitu arvioSeuraavanVaiheenAlkamisesta kenttä, joka oli ei objektimuotoinen (oletetaan, että oli string muotoinen)
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

    // 7. Korvaa nykyisin lokalisoitu suunnittelunEteneminenJaKesto kenttä, joka oli ei objektimuotoinen (oletetaan, että oli string muotoinen)
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

    // 8. Poista mahdollinen saamenkielinen kenttä kun sitä ei lisätä
    if ("videot" == key && value) {
      const videot: LocalizedMap<Linkki>[] = value.map((video: Linkki | LocalizedMap<Linkki>) => {
        if (video && Object.keys(video).includes("SUOMI")) {
          // Remove possible key "SAAME" by not including it
          const videoLokalisoituna: LocalizedMap<Linkki> = video as LocalizedMap<Linkki>;
          const newVideo: LocalizedMap<Linkki> = {
            [Kieli.SUOMI]: videoLokalisoituna?.[Kieli.SUOMI] ?? undefined,
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

    // 9. Varmistetaan, että suunnittelumateriaali on suomi/ruotsi muotoinen LocalizedString objekti
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

    // 10. Korvataan vanhan niminen "Saapumisohjeet" kentällä "lisatiedot"
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

      // 11. Varmistetaan, että vuorovaikutustilaisuuksien kentät on suomi/ruotsi muotoisia LocalizedString objekteja
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

    // 12. Korvataan siirretään pdf polku toiselle avaimelle (kunta -> kunta tai toinen viranomainen)
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

    // 13. Varmistetaan, että EU-rahoituslogoille lisätään ruotsinkielinen versio, jos ruotsi toisena kielenä
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

    // 14. Varmistetaan, että suunnittelusopimuksen logoille lisätään ruotsinkielinen versio, jos ruotsi toisena kielenä
    if ("logo" == key && value && !value.SUOMI) {
      const returned: LocalizedMap<string> = {
        SUOMI: value,
      };
      if (projekti.kielitiedot?.toissijainenKieli == Kieli.RUOTSI) {
        returned.RUOTSI = value;
      }
      return returned;
    }

    // 15. Poistetaan mistä tahansa LocalizedMap kentästä saamenkieli
    if (value && typeof value === "object" && Object.keys(value).includes("SAAME")) {
      const newValue: LocalizedMap<string> | LocalizedMap<Linkki> = {
        SUOMI: value[Kieli.SUOMI],
      };
      if (Object.keys(value).includes("RUOTSI")) {
        newValue[Kieli.RUOTSI] = value[Kieli.RUOTSI];
      }
      return newValue;
    }
    return undefined;
  });

  // 16. Lisätään projektille versiotieto jos se puuttuu
  if (!p.versio) {
    p.versio = 1;
  }

  // 17. Julkaisuille lisätään kuulutusyhteystiedot / esitettavat yhteystiedot
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

  // 18. Yhdistää suunnitelmaluonnokset ja esittelyaineistot yhteen arrayhin, ellei ne jo ole
  updateVuorovaikutusAineistot(p);

  p.lausuntoPyynnot = lausuntoPyynnot;

  // 19. Poistaa lausuntopyyntökentän, jos se on falsy tai tyhjä array
  if (p.lausuntoPyynnot && !p.lausuntoPyynnot.length) {
    delete p.lausuntoPyynnot;
  }

  // 20. Lisää kaikkiin aineistoihin tai ladattuihin tiedostoihin UUID:t jos ne puuttuvat
  return addUuidToAineistoAndLadattuTiedosto(p, isUpgradeDatabase);
}

function updateVuorovaikutusAineistot(p: DBProjekti) {
  if (p.vuorovaikutusKierros && !p.vuorovaikutusKierros?.aineistot) {
    const esittelyaineistot: VuorovaikutusKierros["aineistot"] = (p.vuorovaikutusKierros as any)?.["esittelyaineistot"];
    const suunnitelmaluonnokset: VuorovaikutusKierros["aineistot"] = (p.vuorovaikutusKierros as any)?.["suunnitelmaluonnokset"];

    if (esittelyaineistot || suunnitelmaluonnokset) {
      p.vuorovaikutusKierros.aineistot = combineEsittelyAineistotAndSuunnitelmaluonnokset(esittelyaineistot, suunnitelmaluonnokset);
    }
  }
  delete (p.vuorovaikutusKierros as any)?.["esittelyaineistot"];
  delete (p.vuorovaikutusKierros as any)?.["suunnitelmaluonnokset"];

  p.vuorovaikutusKierrosJulkaisut?.forEach((julkaisu) => {
    if (!julkaisu?.aineistot) {
      const esittelyaineistot: VuorovaikutusKierros["aineistot"] = (julkaisu as any)?.["esittelyaineistot"];
      const suunnitelmaluonnokset: VuorovaikutusKierros["aineistot"] = (julkaisu as any)?.["suunnitelmaluonnokset"];

      if (esittelyaineistot || suunnitelmaluonnokset) {
        julkaisu.aineistot = combineEsittelyAineistotAndSuunnitelmaluonnokset(esittelyaineistot, suunnitelmaluonnokset);
      }
    }
    delete (julkaisu as any)?.["esittelyaineistot"];
    delete (julkaisu as any)?.["suunnitelmaluonnokset"];
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

function addUuidToAineistoAndLadattuTiedosto(p: DBProjekti, isUpgradeDatabase: boolean) {
  return cloneDeepWith(p as any, (value, key) => {
    if (
      key &&
      typeof key == "string" &&
      ["aineistot", "aineistoNahtavilla", "muuAineisto", "muistutukset", "lisaAineistot", "hyvaksymisPaatos"].includes(key) &&
      Array.isArray(value)
    ) {
      if (!value.every((item) => !!item.uuid)) {
        if (isUpgradeDatabase) {
          return value.map<Aineisto>((item) => ({ ...item, uuid: uuid.v4() }));
        }
        return value.map<Aineisto>((item) => ({ ...item, uuid: uuid.v4(), uuidGeneratedBySchemaMigration: true }));
      } else {
        return value;
      }
    } else if (
      key &&
      typeof key == "string" &&
      ["lahetekirje", "kuulutusPDF", "kuulutusIlmoitusPDF"].includes(key) &&
      typeof value == "object"
    ) {
      if (!value?.uuid) {
        return { ...value, uuid: uuid.v4() };
      } else {
        return value;
      }
    } else if (key == "vuorovaikutusSaamePDFt" && typeof value == "object" && value.POHJOISSAAME) {
      if (!value.POHJOISSAAME.uuid) {
        return {
          ...value,
          POHJOISSAAME: {
            ...value.POHJOISSAAME,
            uuid: uuid.v4(),
          },
        };
      } else {
        return value;
      }
    }
  });
}
