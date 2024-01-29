import {
  AloitusKuulutus,
  AloitusKuulutusJulkaisu,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  LausuntoPyynnonTaydennys,
  LausuntoPyynto,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
} from "../database/model";
import { assertIsDefined } from "../util/assertions";

export abstract class PathTuple {
  protected readonly parent: PathTuple;

  constructor(parent?: PathTuple) {
    // TODO Varmista että tämä on ok
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.parent = parent;
  }

  abstract get yllapitoPath(): string;

  abstract get publicPath(): string;

  get publicFullPath(): string {
    return this.parent ? this.parent.publicFullPath + "/" + this.publicPath : "";
  }

  get yllapitoFullPath(): string {
    return this.parent ? this.parent.yllapitoFullPath + "/" + this.yllapitoPath : "";
  }

  get projektiRootPath(): PathTuple {
    if (this.parent) {
      return this.parent.projektiRootPath;
    }
    return this;
  }
}

export class ProjektiPaths extends PathTuple {
  static PATH_ALOITUSKUULUTUS = "aloituskuulutus";
  static PATH_NAHTAVILLAOLO = "nahtavillaolo";
  static PATH_LAUSUNTOPYYNTO = "lausuntopyynto";
  static PATH_LAUSUNTOPYYNNON_TAYDENNYS = "lausuntopyynnon_taydennys";
  static PATH_HYVAKSYMISPAATOS = "hyvaksymispaatos";
  static PATH_JATKOPAATOS1 = "jatkopaatos1";
  static PATH_JATKOPAATOS2 = "jatkopaatos2";
  static PATH_SUUNNITTELUVAIHE = "suunnitteluvaihe";

  private readonly oid: string;

  public constructor(oid: string) {
    super();
    this.oid = oid;
  }

  get yllapitoPath(): string {
    return "";
  }

  get yllapitoFullPath(): string {
    return `yllapito/tiedostot/projekti/${this.oid}`;
  }

  get publicPath(): string {
    return "";
  }

  get publicFullPath(): string {
    return `tiedostot/suunnitelma/${this.oid}`;
  }

  aloituskuulutus(julkaisu: AloitusKuulutus | AloitusKuulutusJulkaisu | undefined): AloituskuulutusPaths {
    return new AloituskuulutusPaths(this, julkaisu);
  }

  vuorovaikutus(vuorovaikutusKierros: VuorovaikutusKierros | VuorovaikutusKierrosJulkaisu | undefined): VuorovaikutusPaths {
    return new VuorovaikutusPaths(this, vuorovaikutusKierros);
  }

  nahtavillaoloVaihe(nahtavillaoloVaihe: NahtavillaoloVaihe | NahtavillaoloVaiheJulkaisu | undefined | null): PathTuple {
    return new NahtavillaoloVaihePaths(this, nahtavillaoloVaihe);
  }

  lausuntoPyynto(lausuntoPyynto: LausuntoPyynto | undefined | null): PathTuple {
    return new LausuntoPyyntoPaths(this, lausuntoPyynto);
  }

  lausuntoPyynnonTaydennys(lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys | undefined | null): PathTuple {
    return new LausuntoPyynnonTaydennysPaths(this, lausuntoPyynnonTaydennys);
  }

  euLogot(): PathTuple {
    return new EULogotPaths(this);
  }

  karttarajaus(): PathTuple {
    return new KarttarajausPaths(this);
  }

  suunnittelusopimus(): PathTuple {
    return new SuunnittelusopimusPaths(this);
  }

  hyvaksymisPaatosVaihe(
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe | HyvaksymisPaatosVaiheJulkaisu | undefined | null
  ): HyvaksymisPaatosVaihePaths {
    return new HyvaksymisPaatosVaihePaths(this, ProjektiPaths.PATH_HYVAKSYMISPAATOS, hyvaksymisPaatosVaihe);
  }

  jatkoPaatos1Vaihe(
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe | HyvaksymisPaatosVaiheJulkaisu | undefined | null
  ): HyvaksymisPaatosVaihePaths {
    return new HyvaksymisPaatosVaihePaths(this, ProjektiPaths.PATH_JATKOPAATOS1, hyvaksymisPaatosVaihe);
  }

  jatkoPaatos2Vaihe(
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe | HyvaksymisPaatosVaiheJulkaisu | undefined | null
  ): HyvaksymisPaatosVaihePaths {
    return new HyvaksymisPaatosVaihePaths(this, ProjektiPaths.PATH_JATKOPAATOS2, hyvaksymisPaatosVaihe);
  }
}

abstract class SimpleRootPath extends PathTuple {
  protected constructor(parent: PathTuple) {
    super(parent);
  }

  abstract get rootPath(): string;

  get yllapitoPath(): string {
    return this.parent.yllapitoPath + this.rootPath;
  }

  get publicPath(): string {
    return this.parent.publicPath + this.rootPath;
  }

  get yllapitoFullPath(): string {
    return this.parent.yllapitoFullPath + "/" + this.rootPath;
  }

  get publicFullPath(): string {
    return this.parent.publicFullPath + "/" + this.rootPath;
  }
}

class EULogotPaths extends SimpleRootPath {
  constructor(parent: PathTuple) {
    super(parent);
  }

  get rootPath(): string {
    return "euLogot";
  }
}

class KarttarajausPaths extends SimpleRootPath {
  constructor(parent: PathTuple) {
    super(parent);
  }

  get rootPath(): string {
    return "karttarajaus";
  }
}

class SuunnittelusopimusPaths extends SimpleRootPath {
  constructor(parent: PathTuple) {
    super(parent);
  }

  get rootPath(): string {
    return "suunnittelusopimus";
  }
}

export class VuorovaikutusPaths extends PathTuple {
  private readonly vuorovaikutus?: VuorovaikutusKierros | VuorovaikutusKierrosJulkaisu;

  constructor(parent: PathTuple, vuorovaikutus: VuorovaikutusKierros | VuorovaikutusKierrosJulkaisu | undefined) {
    super(parent);
    this.vuorovaikutus = vuorovaikutus;
  }

  private getId(): number {
    assertIsDefined(this.vuorovaikutus, "vuorovaikutus pitää olla annettu");
    if ((this.vuorovaikutus as VuorovaikutusKierros).vuorovaikutusNumero !== undefined) {
      return (this.vuorovaikutus as VuorovaikutusKierros).vuorovaikutusNumero;
    } else {
      return (this.vuorovaikutus as VuorovaikutusKierrosJulkaisu).id;
    }
  }

  get yllapitoPath(): string {
    return this.parent.yllapitoPath + ProjektiPaths.PATH_SUUNNITTELUVAIHE + "/vuorovaikutus_" + this.getId().toString();
  }

  get publicPath(): string {
    return this.parent.publicPath + ProjektiPaths.PATH_SUUNNITTELUVAIHE + "/vuorovaikutus_" + this.getId().toString();
  }

  get yllapitoFullPath(): string {
    return this.parent.yllapitoFullPath + "/" + ProjektiPaths.PATH_SUUNNITTELUVAIHE + "/vuorovaikutus_" + this.getId().toString();
  }

  get publicFullPath(): string {
    return this.parent.publicFullPath + "/" + ProjektiPaths.PATH_SUUNNITTELUVAIHE + "/vuorovaikutus_" + this.getId().toString();
  }

  get aineisto(): VuorovaikutusAineisto {
    return new VuorovaikutusAineisto(this);
  }

  get kutsu(): VuorovaikutusKutsu {
    return new VuorovaikutusKutsu(this);
  }
}

class VuorovaikutusAineisto extends PathTuple {
  constructor(parent: PathTuple) {
    super(parent);
  }

  get publicPath(): string {
    return this.parent.publicPath + "/" + "aineisto";
  }

  get yllapitoPath(): string {
    return this.parent.yllapitoPath + "/" + "aineisto";
  }

  get yllapitoFullPath(): string {
    return this.parent.yllapitoFullPath + "/" + "aineisto";
  }

  get publicFullPath(): string {
    return this.parent.publicFullPath + "/" + "aineisto";
  }
}

class VuorovaikutusKutsu extends PathTuple {
  constructor(parent: PathTuple) {
    super(parent);
  }

  get yllapitoPath(): string {
    return this.parent.yllapitoPath + "/" + "kutsu";
  }

  get yllapitoFullPath(): string {
    return this.parent.yllapitoFullPath + "/" + "kutsu";
  }

  get publicPath(): string {
    return this.parent.publicPath + "/" + "kutsu";
  }

  get publicFullPath(): string {
    return this.parent.publicFullPath + "/" + "kutsu";
  }
}

export class AloituskuulutusPaths extends PathTuple {
  private readonly kuulutusId?: number;

  constructor(parent: PathTuple, kuulutus: AloitusKuulutus | AloitusKuulutusJulkaisu | undefined) {
    super(parent);
    this.kuulutusId = kuulutus?.id;
  }

  get yllapitoPath(): string {
    assertIsDefined(this.kuulutusId, "AloitusKuulutusJulkaisu.id pitää olla annettu");
    return ProjektiPaths.PATH_ALOITUSKUULUTUS + "/" + this.kuulutusId;
  }

  get publicPath(): string {
    return ProjektiPaths.PATH_ALOITUSKUULUTUS;
  }
}

class NahtavillaoloVaihePaths extends PathTuple {
  private readonly nahtavillaoloVaiheId?: number;

  constructor(parent: PathTuple, nahtavillaoloVaihe: NahtavillaoloVaihe | NahtavillaoloVaiheJulkaisu | undefined | null) {
    super(parent);
    this.nahtavillaoloVaiheId = nahtavillaoloVaihe?.id;
  }

  get yllapitoPath(): string {
    assertIsDefined(this.nahtavillaoloVaiheId, "nahtavillaoloVaiheId pitää olla annettu");
    return ProjektiPaths.PATH_NAHTAVILLAOLO + "/" + this.nahtavillaoloVaiheId;
  }

  get publicPath(): string {
    return ProjektiPaths.PATH_NAHTAVILLAOLO;
  }
}

class LausuntoPyyntoPaths extends PathTuple {
  private readonly lausuntoPyyntoUuid?: string;

  constructor(parent: PathTuple, lausuntoPyynto: LausuntoPyynto | undefined | null) {
    super(parent);
    this.lausuntoPyyntoUuid = lausuntoPyynto?.uuid;
  }

  get yllapitoPath(): string {
    assertIsDefined(this.lausuntoPyyntoUuid, "lausuntoPyyntoUuid pitää olla annettu");
    return ProjektiPaths.PATH_LAUSUNTOPYYNTO + "/" + this.lausuntoPyyntoUuid;
  }

  get publicPath(): string {
    return ProjektiPaths.PATH_LAUSUNTOPYYNTO;
  }
}

class LausuntoPyynnonTaydennysPaths extends PathTuple {
  private readonly lausuntoPyynnonTaydennysUuid?: string;

  constructor(parent: PathTuple, lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys | undefined | null) {
    super(parent);
    this.lausuntoPyynnonTaydennysUuid = lausuntoPyynnonTaydennys?.uuid;
  }

  get yllapitoPath(): string {
    assertIsDefined(this.lausuntoPyynnonTaydennysUuid, "lausuntoPyynnonTaydennysUuid pitää olla annettu");
    return ProjektiPaths.PATH_LAUSUNTOPYYNNON_TAYDENNYS + "/" + this.lausuntoPyynnonTaydennysUuid;
  }

  get publicPath(): string {
    return ProjektiPaths.PATH_LAUSUNTOPYYNNON_TAYDENNYS;
  }
}

class VersionedPaths<T extends { id: number } | undefined | null> extends PathTuple {
  private readonly id?: number;
  private readonly folder: string;

  constructor(parent: PathTuple, folder: string, versionedElement: T | undefined) {
    super(parent);
    this.folder = folder;
    this.id = versionedElement?.id;
  }

  get yllapitoPath(): string {
    assertIsDefined(this.id, "id pitää olla annettu");
    return this.folder + "/" + this.id;
  }

  get publicPath(): string {
    return this.folder;
  }
}

export class HyvaksymisPaatosVaihePaths extends VersionedPaths<HyvaksymisPaatosVaihe | HyvaksymisPaatosVaiheJulkaisu | undefined | null> {
  get paatos(): PathTuple {
    return new (class extends PathTuple {
      get yllapitoPath(): string {
        return this.parent.yllapitoPath + "/" + "paatos";
      }

      get publicPath(): string {
        return this.parent.publicPath + "/" + "paatos";
      }

      get publicFullPath(): string {
        return this.parent.publicFullPath + "/" + "paatos";
      }

      get yllapitoFullPath(): string {
        return this.parent.yllapitoFullPath + "/" + "paatos";
      }
    })(this);
  }
}
