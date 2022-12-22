import {
  AloitusKuulutus,
  AloitusKuulutusJulkaisu,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  Vuorovaikutus,
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
}

export class ProjektiPaths extends PathTuple {
  static PATH_ALOITUSKUULUTUS = "aloituskuulutus";
  static PATH_NAHTAVILLAOLO = "nahtavillaolo";
  static PATH_HYVAKSYMISPAATOS = "hyvaksymispaatos";
  static PATH_JATKOPAATOS1 = "jatkopaatos1";
  static PATH_JATKOPAATOS2 = "jatkopaatos2";

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

  vuorovaikutus(vuorovaikutus: Vuorovaikutus): VuorovaikutusPaths {
    return new VuorovaikutusPaths(this, vuorovaikutus);
  }

  nahtavillaoloVaihe(nahtavillaoloVaihe: NahtavillaoloVaihe | NahtavillaoloVaiheJulkaisu | undefined | null): PathTuple {
    return new NahtavillaoloVaihePaths(this, nahtavillaoloVaihe);
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

class VuorovaikutusPaths extends PathTuple {
  private vuorovaikutus: Vuorovaikutus;

  constructor(parent: PathTuple, vuorovaikutus: Vuorovaikutus) {
    super(parent);
    this.vuorovaikutus = vuorovaikutus;
  }

  get yllapitoPath(): string {
    return "suunnitteluvaihe/vuorovaikutus_" + this.vuorovaikutus.vuorovaikutusNumero;
  }

  get publicPath(): string {
    return "suunnitteluvaihe/vuorovaikutus_" + this.vuorovaikutus.vuorovaikutusNumero;
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

class AloituskuulutusPaths extends PathTuple {
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
