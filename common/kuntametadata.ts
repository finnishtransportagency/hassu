import velhometadata from "./generated/velhometadata.json";
import sykeKunnat from "./generated/kunnat.json";
import sykeMaakunnat from "./generated/maakunnat.json";
import elyt from "./generated/ely.json";
import { RequiredLocalizedMap } from "../backend/src/database/model";
import { IlmoitettavaViranomainen, Kieli } from "./graphql/apiModel";
import { IllegalArgumentError } from "../backend/src/error/IllegalArgumentError";
import log from "loglevel";

import NodeCache from "node-cache";

const metadataCache = new NodeCache();

type VelhoKunta = {
  maakunta: string; //"maakunta/maakunta17",
  koodi: string; //"563",
  otsikko: string; // "Oulainen",
  "liikennevastuu-ely": string; //"ely/ely13",
  ely: string; //"ely/ely13",
  avi: string; // "avi/avi5"
};

type VelhoMaakunta = {
  maakunta: string; //"maakunta/maakunta17",
  koodi: string; //"563",
};

export type Kunta = {
  id: number;
  maakuntaId: number;
  nimi: RequiredLocalizedMap<string>;
  elyId: number;
  liikennevastuuElyId: number;
};

export type Maakunta = {
  id: number;
  nimi: RequiredLocalizedMap<string>;
  ely: number;
};

const sykeKuntaIdToLocalizedNimi = () =>
  sykeKunnat.value.reduce((kunnat, kunta) => {
    kunnat[kunta.Kunta_Id] = {
      [Kieli.SUOMI]: kunta.Nimi,
      [Kieli.RUOTSI]: kunta.NimiRuo,
    };
    return kunnat;
  }, {} as Record<number, RequiredLocalizedMap<string>>);

const sykeMaakuntaIdToMaakunta = () =>
  sykeMaakunnat.value.reduce((maakunnat, maakunta) => {
    maakunnat[maakunta.Maakunta_Id] = {
      nimi: {
        [Kieli.SUOMI]: maakunta.Nimi,
        [Kieli.RUOTSI]: maakunta.NimiRuo,
      },
      elyId: maakunta.Ely_Id,
    };
    return maakunnat;
  }, {} as Record<number, { nimi: RequiredLocalizedMap<string>; elyId: number }>);

abstract class AbstractLocalCache<T> {
  private readonly mapCacheKey: string;
  private readonly listCacheKey: string;

  protected constructor(cacheKey: string) {
    this.mapCacheKey = cacheKey + "_map";
    this.listCacheKey = cacheKey + "_list";
  }

  get list(): T[] {
    if (!metadataCache.has(this.listCacheKey)) {
      this.populateInternal();
    }
    return metadataCache.get(this.listCacheKey)!;
  }

  getById(id: number): T {
    if (!metadataCache.has(this.mapCacheKey)) {
      this.populateInternal();
    }
    return (metadataCache.get(this.mapCacheKey)! as Record<number, T>)[id];
  }

  private populateInternal() {
    const { list, map } = this.populate();
    metadataCache.set(this.listCacheKey, list);
    metadataCache.set(this.mapCacheKey, map);
  }

  abstract populate(): { list: T[]; map: Record<number, T> };
}

class Kunnat extends AbstractLocalCache<Kunta> {
  constructor() {
    super("kunnat");
  }

  populate(): { list: Kunta[]; map: Record<number, Kunta> } {
    const kuntaList: Kunta[] = [];
    const kuntaMap: Record<number, Kunta> = {};

    const velhoKunnat = kuntametadata.extractLatestVersionOfVelhoMetadata(velhometadata, "alueet/kunta") as Record<string, VelhoKunta>;
    for (const velhoKuntaId in velhoKunnat) {
      const velhoKunta = velhoKunnat[velhoKuntaId];
      const kuntaId = Number.parseInt(velhoKunta.koodi);
      let nimi = sykeKuntaIdToLocalizedNimi()[kuntaId];
      if (!nimi) {
        // Honkajokea ei enää ole itsenäisenä kuntana
        if (velhoKunta.otsikko !== "Honkajoki") {
          log.warn("Kuntaa ei löydy syke-aineistosta", { nimi, velhoKunta });
        }
        nimi = { SUOMI: velhoKunta.otsikko };
      }
      const kunta = {
        id: kuntaId,
        nimi,
        elyId: kuntametadata.parseNumberIdFromVelhoKey(velhoKunta.ely),
        liikennevastuuElyId: kuntametadata.parseNumberIdFromVelhoKey(velhoKunta["liikennevastuu-ely"]),
        maakuntaId: kuntametadata.parseNumberIdFromVelhoKey(velhoKunta.maakunta),
      };
      kuntaList.push(kunta);
      kuntaMap[kuntaId] = kunta;
    }
    return { list: kuntaList, map: kuntaMap };
  }
}

class Maakunnat extends AbstractLocalCache<Maakunta> {
  constructor() {
    super("maakunnat");
  }

  populate(): { list: Maakunta[]; map: Record<number, Maakunta> } {
    const maakuntaList: Maakunta[] = [];
    const maakuntaMap: Record<number, Maakunta> = {};
    const velhoMaakunnat = kuntametadata.extractLatestVersionOfVelhoMetadata(velhometadata, "alueet/maakunta") as Record<
      string,
      VelhoMaakunta
    >;
    for (const velhoMaakuntaId in velhoMaakunnat) {
      const velhoMaakunta = velhoMaakunnat[velhoMaakuntaId];
      const maakuntaId = Number.parseInt(velhoMaakunta.koodi);
      const sykeMaakunta = sykeMaakuntaIdToMaakunta()[maakuntaId];
      const maakunta = {
        id: maakuntaId,
        nimi: sykeMaakunta.nimi,
        ely: sykeMaakunta.elyId,
      };
      maakuntaList.push(maakunta);
      maakuntaMap[maakuntaId] = maakunta;
    }
    return { list: maakuntaList, map: maakuntaMap };
  }
}

class KuntaMetadata {
  kunnat = new Kunnat();
  maakunnat = new Maakunnat();

  extractLatestVersionOfVelhoMetadata(velhoJSON: typeof velhometadata, field: string): unknown {
    const definition: any = (velhoJSON.info["x-velho-nimikkeistot"] as any)[field];
    return definition.nimikkeistoversiot[definition["uusin-nimikkeistoversio"]];
  }

  parseNumberIdFromVelhoKey(key: string): number {
    const match = key.match(/\w+\/[a-z]+(\d+)/);
    if (match && match.length == 2) {
      const val = Number.parseInt(match[1]);
      if (!isNaN(val)) {
        return val;
      }
    }
    throw new Error("Could not parse number from key:" + key);
  }

  public idsForKuntaNames(names: string[] | number[]): number[] {
    return names.map(kuntametadata.idForKuntaName);
  }

  idForKuntaName(name: string | number): number {
    if (typeof name == "number") {
      return name;
    }
    const trimmedName = name.trim().toLowerCase();
    const kunta = kuntametadata.kunnat.list.find((kunta) => kunta.nimi.SUOMI.toLowerCase() == trimmedName);
    if (kunta) {
      return kunta.id;
    }
    throw new IllegalArgumentError("kuntaa ei löydy:" + name);
  }

  idsForMaakuntaNames(names: string[] | number[]): number[] {
    return names.map(kuntametadata.idForMaakuntaName);
  }

  idForMaakuntaName(name: string | number): number {
    if (typeof name == "number" || !isNaN(Number(name))) {
      return Number(name);
    }
    const maakunta = kuntametadata.maakunnat.list.find((maakunta) => maakunta.nimi.SUOMI == name);
    if (maakunta) {
      return maakunta.id;
    }
    throw new IllegalArgumentError("maakuntaa ei löydy:" + name);
  }

  public kuntaOptions(lang: string, addEmptyOption = true): { value: string; label: string }[] {
    let options: { label: string; value: string }[];
    const kuntaList = kuntametadata.kunnat.list;
    if (lang == "sv") {
      options = kuntaList.map((kunta) => ({ value: String(kunta.id), label: kunta.nimi.RUOTSI || kunta.nimi.SUOMI }));
    } else {
      options = kuntaList.map((kunta) => ({ value: String(kunta.id), label: kunta.nimi.SUOMI }));
    }
    if (addEmptyOption) options.push({ label: "", value: "" });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }

  public maakuntaOptions(lang: string, addEmptyOption = true): { value: string; label: string }[] {
    let options: { label: string; value: string }[];
    const maakuntaList = kuntametadata.maakunnat.list;
    if (lang == "sv") {
      options = maakuntaList.map((kunta) => ({ value: String(kunta.id), label: kunta.nimi.RUOTSI || kunta.nimi.SUOMI }));
    } else {
      options = maakuntaList.map((kunta) => ({ value: String(kunta.id), label: kunta.nimi.SUOMI }));
    }
    if (addEmptyOption) options.push({ label: "", value: "" });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }

  public nameForKuntaId(kuntaId: number, kieli: Kieli | string): string {
    const nimi = kuntametadata.kunnat.getById(kuntaId)?.nimi;
    if (!nimi) {
      log.error("kuntaa-ei-löydy:" + kuntaId);
      return "kuntaa-ei-löydy:" + kuntaId;
    }

    const localizedNimi = nimi[normalizeKieli(kieli)];
    if (localizedNimi) {
      return localizedNimi;
    }
    return nimi[Kieli.SUOMI];
  }

  public nameForMaakuntaId(maakuntaId: number, kieli: Kieli): string {
    const nimi = kuntametadata.maakunnat.getById(maakuntaId)?.nimi;
    if (!nimi) {
      log.error("maakuntaa-ei-löydy:" + maakuntaId);
      return "maakuntaa-ei-löydy:" + maakuntaId;
    }

    const localizedNimi = nimi[kieli];
    if (localizedNimi) {
      return localizedNimi;
    }
    return nimi[Kieli.SUOMI];
  }

  public namesForKuntaIds(kuntaIds: number[] | null | undefined, kieli: Kieli | string): string[] {
    return kuntaIds?.map((kuntaId) => kuntametadata.nameForKuntaId(kuntaId, normalizeKieli(kieli))) || [];
  }

  public namesForMaakuntaIds(maakuntaIds: number[] | null | undefined, kieli: Kieli | string): string[] {
    return maakuntaIds?.map((maakuntaId) => kuntametadata.nameForMaakuntaId(maakuntaId, normalizeKieli(kieli))) || [];
  }

  public viranomainenForMaakuntaId(maakuntaId: number): IlmoitettavaViranomainen {
    const maakunta = sykeMaakuntaIdToMaakunta()[maakuntaId];
    if (!maakunta) {
      throw new Error("Maakuntaa ei löydy:" + maakuntaId);
    }

    const viranomainen = elyToIlmoitettavaViranomainen[maakunta.elyId];
    if (viranomainen) {
      return viranomainen;
    }
    return IlmoitettavaViranomainen.VAYLAVIRASTO;
  }

  kuntaForKuntaId(kuntaId: number): Kunta | undefined {
    return kuntametadata.kunnat.getById(kuntaId);
  }

  maakuntaForMaakuntaId(maakuntaId: number): Maakunta | undefined {
    return kuntametadata.maakunnat.getById(maakuntaId);
  }

  /**
   * Käytetään ilmoitustaulusyötteen avaimen muuttamiseen numero-id:ksi
   * @param key
   */
  elyIdFromKey(key: string) {
    return elyt[key as keyof typeof elyt]?.id;
  }

  liikennevastuuElyIdFromElyId(elyId: number): number {
    const ely = Object.values(elyt).find((ely) => ely.id == elyId);
    if (ely) {
      return ely.lelyId;
    }
    throw new IllegalArgumentError("Liikenne-ely ei löydy ely-id:lle " + elyId);
  }
}

function normalizeKieli(kieli: Kieli | string): Kieli {
  switch (kieli) {
    case Kieli.RUOTSI:
    case "sv":
      return Kieli.RUOTSI;
    case Kieli.SAAME:
    case "se":
      return Kieli.SAAME;
    default:
      return Kieli.SUOMI;
  }
}

export const kuntametadata = new KuntaMetadata();

// Lähde: https://rajapinnat.ymparisto.fi/api/Hakemistorajapinta/1.0/odata/Ely
const elyToIlmoitettavaViranomainen: Record<number, IlmoitettavaViranomainen> = {
  1001: IlmoitettavaViranomainen.UUDENMAAN_ELY,
  1005: IlmoitettavaViranomainen.ETELA_SAVO_ELY,
  1008: IlmoitettavaViranomainen.ETELA_POHJANMAAN_ELY,
  1003: IlmoitettavaViranomainen.HAME_ELY,
  1004: IlmoitettavaViranomainen.KAAKKOIS_SUOMEN_ELY,
  1009: IlmoitettavaViranomainen.KESKI_SUOMEN_ELY,
  1012: IlmoitettavaViranomainen.KAINUUN_ELY,
  1013: IlmoitettavaViranomainen.LAPIN_ELY,
  1019: IlmoitettavaViranomainen.PIRKANMAAN_ELY,
  1021: IlmoitettavaViranomainen.POHJANMAAN_ELY,
  1007: IlmoitettavaViranomainen.POHJOIS_KARJALAN_ELY,
  1011: IlmoitettavaViranomainen.POHJOIS_POHJANMAAN_ELY,
  1006: IlmoitettavaViranomainen.POHJOIS_SAVON_ELY,
  1020: IlmoitettavaViranomainen.SATAKUNNAN_ELY,
  1002: IlmoitettavaViranomainen.VARSINAIS_SUOMEN_ELY,
  1030: IlmoitettavaViranomainen.AHVENANMAAN_ELY,
};
