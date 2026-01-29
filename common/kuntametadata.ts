import { alueData } from "./generated/aluedata";
import { RequiredLocalizedMap } from "../backend/src/database/model";
import { IlmoitettavaViranomainen, Kieli } from "./graphql/apiModel";
import { IllegalArgumentError } from "./error/IllegalArgumentError";
import log from "loglevel";

import { findKey } from "lodash";
import { KaannettavaKieli, normalizeKieli } from "./kaannettavatKielet";

export type Kunta = {
  id: number;
  maakunta: string;
  nimi: RequiredLocalizedMap<string>;
  ely: string;
  liikennevastuuEly: string;
  elinvoimakeskus: string;
  lakkautettu?: boolean;
};

export type Maakunta = {
  id: string;
  koodi: string;
  nimi: RequiredLocalizedMap<string>;
  liittoNimi?: string | null;
  lakkautettu?: boolean;
};

export type Ely = {
  nro: string;
  lyhenne: string;
  sykeElyId: number;
};

export type Elinvoimakeskus = {
  nro: string;
  lyhenne: string;
  sykeElinvoimakeskusId: number;
  nimiSuomi: string;
};

export type AlueData = {
  kunnat: Record<string, Kunta>;
  maakunnat: Record<string, Maakunta>;
  elyt: Record<string, Ely>;
  elinvoimakeskukset: Record<string, Elinvoimakeskus>;
};

class KuntaMetadata {
  public idsForKuntaNames(names: string[] | number[]): number[] {
    return names.map(kuntametadata.idForKuntaName);
  }

  idForKuntaName(name: string | number): number {
    if (typeof name == "number") {
      return name;
    }
    const trimmedName = name.trim().toLowerCase();
    const kuntaId = findKey(alueData.kunnat, (kunta: Kunta) => kunta.nimi.SUOMI.toLowerCase() == trimmedName);
    if (kuntaId) {
      return alueData.kunnat[kuntaId].id;
    }
    throw new IllegalArgumentError("kuntaa ei löydy: " + name);
  }

  idsForMaakuntaNames(names: string[] | number[]): number[] {
    return names.map(kuntametadata.idForMaakuntaName);
  }

  idForMaakuntaName(name: string | number): number {
    // tyhjä string ei ok ettei tule numeroksi 0
    if (typeof name == "number" || (name && !isNaN(Number(name)))) {
      return Number(name);
    }
    const maakuntaId = findKey(alueData.maakunnat, (maakunta) => {
      return maakunta.nimi.SUOMI.toLowerCase() == name.toLowerCase();
    });
    if (maakuntaId) {
      return Number.parseInt(maakuntaId);
    }
    throw new IllegalArgumentError("maakuntaa ei löydy:" + name);
  }

  public kuntaOptions(lang: string, addEmptyOption = true): { value: string; label: string }[] {
    let options: { label: string; value: string }[];
    const kuntaList = Object.values(alueData.kunnat);
    if (lang == "sv") {
      options = kuntaList
        .filter((kunta) => !kunta.lakkautettu)
        .map((kunta) => {
          return { value: String(kunta.id), label: kunta.nimi.RUOTSI || kunta.nimi.SUOMI };
        });
    } else {
      options = kuntaList.filter((kunta) => !kunta.lakkautettu).map((kunta) => ({ value: String(kunta.id), label: kunta.nimi.SUOMI }));
    }
    if (addEmptyOption) {
      options.push({ label: "", value: "" });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }

  public maakuntaOptions(lang: string, addEmptyOption = true): { value: string; label: string }[] {
    let options: { label: string; value: string }[];
    const maakuntaList = Object.values(alueData.maakunnat);
    if (lang == "sv") {
      options = maakuntaList
        .filter((maakunta) => !maakunta.lakkautettu)
        .map((maakunta) => ({ value: String(Number.parseInt(maakunta.koodi)), label: maakunta.nimi.RUOTSI || maakunta.nimi.SUOMI }));
    } else {
      options = maakuntaList
        .filter((maakunta) => !maakunta.lakkautettu)
        .map((maakunta) => ({ value: String(Number.parseInt(maakunta.koodi)), label: maakunta.nimi.SUOMI }));
    }
    if (addEmptyOption) {
      options.push({ label: "", value: "" });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }

  public nameForKuntaId(kuntaId: number, kieli: KaannettavaKieli | string): string {
    const kaytettavaKieli: KaannettavaKieli = normalizeKieli(kieli);
    const nimi = alueData.kunnat[kuntaId]?.nimi;
    if (!nimi) {
      log.error("kuntaa-ei-löydy:" + kuntaId);
      return "kuntaa-ei-löydy:" + kuntaId;
    }

    const localizedNimi = nimi[kaytettavaKieli];
    if (localizedNimi) {
      return localizedNimi;
    }
    return nimi[Kieli.SUOMI];
  }

  public nameForMaakuntaId(maakuntaId: number, kieli: Kieli | string): string {
    const nimi = alueData.maakunnat[maakuntaId]?.nimi;
    if (!nimi) {
      log.error("maakuntaa-ei-löydy:" + maakuntaId);
      return "maakuntaa-ei-löydy:" + maakuntaId;
    }

    const localizedNimi = nimi[normalizeKieli(kieli)];
    if (localizedNimi) {
      return localizedNimi;
    }
    return nimi[Kieli.SUOMI];
  }

  public liittoNameForMaakuntaId(maakuntaId: number): string {
    const nimi = alueData.maakunnat[maakuntaId]?.liittoNimi;
    if (!nimi) {
      // Ahvenanmaa
      return this.nameForMaakuntaId(maakuntaId, Kieli.SUOMI);
    }
    return nimi;
  }

  public namesForKuntaIds(kuntaIds: number[] | null | undefined, kieli: Kieli | string): string[] {
    return kuntaIds?.map((kuntaId) => kuntametadata.nameForKuntaId(kuntaId, normalizeKieli(kieli))) || [];
  }

  public namesForMaakuntaIds(maakuntaIds: number[] | null | undefined, kieli: Kieli | string): string[] {
    return maakuntaIds?.map((maakuntaId) => kuntametadata.nameForMaakuntaId(maakuntaId, normalizeKieli(kieli))) || [];
  }

  public elyViranomainenForKuntaId(kuntaId: number): IlmoitettavaViranomainen {
    const kunta = alueData.kunnat[kuntaId];
    if (!kunta) {
      throw new Error("Kuntaa ei löydy:" + kuntaId);
    }

    const viranomainen = elyToIlmoitettavaViranomainen[kunta.ely];
    if (viranomainen) {
      return viranomainen;
    }
    return IlmoitettavaViranomainen.VAYLAVIRASTO;
  }

  public viranomainenForKuntaId(kuntaId: number): IlmoitettavaViranomainen {
    const kunta = alueData.kunnat[kuntaId];
    if (!kunta) {
      throw new Error("Kuntaa ei löydy:" + kuntaId);
    }

    const viranomainen = evkToIlmoitettavaViranomainen[kunta.elinvoimakeskus];
    if (viranomainen) {
      return viranomainen;
    }
    return IlmoitettavaViranomainen.VAYLAVIRASTO;
  }

  kuntaForKuntaId(kuntaId: number): Kunta | undefined {
    return alueData.kunnat[kuntaId];
  }

  maakuntaForMaakuntaId(maakuntaId: number): Maakunta | undefined {
    return alueData.maakunnat[maakuntaId];
  }

  /**
   * Käytetään ilmoitustaulusyötteen avaimen muuttamiseen id:ksi (esim. UUD -> "ely/ely01")
   * @param key
   */
  elyIdFromKey(key: string) {
    return Object.keys(alueData.elyt).find((elyKey) => alueData.elyt[elyKey].lyhenne == key);
  }

  /**
   * Käytetään ilmoitustaulusyötteen avaimen muuttamiseen id:ksi (esim. UUD -> "elinvoimakeskus/elinvoimakeskus01")
   * @param key
   */
  elinvoimakeskusIdFromKey(key: string) {
    return Object.keys(alueData.elinvoimakeskukset).find(
      (elinvoimakeskusKey) => alueData.elinvoimakeskukset[elinvoimakeskusKey].lyhenne == key
    );
  }
}

export const kuntametadata = new KuntaMetadata();

const elyToIlmoitettavaViranomainen: Record<string, IlmoitettavaViranomainen> = {
  "ely/ely01": IlmoitettavaViranomainen.UUDENMAAN_ELY,
  "ely/ely02": IlmoitettavaViranomainen.VARSINAIS_SUOMEN_ELY,
  "ely/ely03": IlmoitettavaViranomainen.SATAKUNNAN_ELY,
  "ely/ely04": IlmoitettavaViranomainen.HAME_ELY,
  "ely/ely05": IlmoitettavaViranomainen.PIRKANMAAN_ELY,
  "ely/ely06": IlmoitettavaViranomainen.KAAKKOIS_SUOMEN_ELY,
  "ely/ely07": IlmoitettavaViranomainen.ETELA_SAVO_ELY,
  "ely/ely08": IlmoitettavaViranomainen.POHJOIS_SAVON_ELY,
  "ely/ely09": IlmoitettavaViranomainen.POHJOIS_KARJALAN_ELY,
  "ely/ely10": IlmoitettavaViranomainen.KESKI_SUOMEN_ELY,
  "ely/ely11": IlmoitettavaViranomainen.ETELA_POHJANMAAN_ELY,
  "ely/ely12": IlmoitettavaViranomainen.POHJANMAAN_ELY,
  "ely/ely13": IlmoitettavaViranomainen.POHJOIS_POHJANMAAN_ELY,
  "ely/ely14": IlmoitettavaViranomainen.KAINUUN_ELY,
  "ely/ely15": IlmoitettavaViranomainen.LAPIN_ELY,
  "ely/ely16": IlmoitettavaViranomainen.AHVENANMAAN_MAAKUNTA,
};

const evkToIlmoitettavaViranomainen: Record<string, IlmoitettavaViranomainen> = {
  "elinvoimakeskus/elinvoimakeskus01": IlmoitettavaViranomainen.UUDENMAAN_EVK,
  "elinvoimakeskus/elinvoimakeskus02": IlmoitettavaViranomainen.LOUNAIS_SUOMEN_EVK,
  "elinvoimakeskus/elinvoimakeskus03": IlmoitettavaViranomainen.KAAKKOIS_SUOMEN_EVK,
  "elinvoimakeskus/elinvoimakeskus04": IlmoitettavaViranomainen.SISA_SUOMEN_EVK,
  "elinvoimakeskus/elinvoimakeskus05": IlmoitettavaViranomainen.KESKI_SUOMEN_EVK,
  "elinvoimakeskus/elinvoimakeskus06": IlmoitettavaViranomainen.ITA_SUOMEN_EVK,
  "elinvoimakeskus/elinvoimakeskus07": IlmoitettavaViranomainen.ETELA_POHJANMAAN_EVK,
  "elinvoimakeskus/elinvoimakeskus08": IlmoitettavaViranomainen.POHJANMAAN_EVK,
  "elinvoimakeskus/elinvoimakeskus09": IlmoitettavaViranomainen.POHJOIS_SUOMEN_EVK,
  "elinvoimakeskus/elinvoimakeskus10": IlmoitettavaViranomainen.LAPIN_EVK,
};
