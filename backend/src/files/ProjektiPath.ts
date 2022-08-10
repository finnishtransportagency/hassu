import {
  HyvaksymisVaihe,
  HyvaksymisVaiheJulkaisu,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  Vuorovaikutus
} from "../database/model";

export abstract class PathTuple {
  protected readonly parent: PathTuple;

  constructor(parent?: PathTuple) {
    this.parent = parent;
  }

  abstract get yllapitoPath(): string;

  abstract get publicPath(): string;

  get publicFullPath(): string {
    return this.parent ? this.parent.publicPath + "/" + this.publicPath : "";
  }
}

export class ProjektiPaths extends PathTuple {
  private readonly oid: string;

  public constructor(oid: string) {
    super();
    this.oid = oid;
  }

  get yllapitoPath(): string {
    return `yllapito/tiedostot/projekti/${this.oid}`;
  }

  get publicPath(): string {
    return `tiedostot/suunnitelma/${this.oid}`;
  }

  get publicFullPath(): string {
    return this.publicPath;
  }

  vuorovaikutus(vuorovaikutus: Vuorovaikutus): VuorovaikutusPaths {
    return new VuorovaikutusPaths(this, vuorovaikutus);
  }

  nahtavillaoloVaihe(nahtavillaoloVaihe: NahtavillaoloVaihe | NahtavillaoloVaiheJulkaisu): PathTuple {
    return new NahtavillaoloVaihePaths(this, nahtavillaoloVaihe);
  }

  hyvaksymisVaihe(hyvaksymisVaihe: HyvaksymisVaihe | HyvaksymisVaiheJulkaisu): HyvaksymisVaihePaths {
    return new HyvaksymisVaihePaths(this, "hyvaksymisvaihe", hyvaksymisVaihe);
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

  get publicFullPath(): string {
    return this.parent.publicFullPath + "/" + "aineisto";
  }
}

class NahtavillaoloVaihePaths extends PathTuple {
  private nahtavillaoloVaiheId: number;

  constructor(parent: PathTuple, nahtavillaoloVaihe: NahtavillaoloVaihe | NahtavillaoloVaiheJulkaisu) {
    super(parent);
    this.nahtavillaoloVaiheId = nahtavillaoloVaihe.id;
  }

  get yllapitoPath(): string {
    return "nahtavillaolo/" + this.nahtavillaoloVaiheId;
  }

  get publicPath(): string {
    return "nahtavillaolo";
  }
}

class VersionedPaths<T extends { id: number }> extends PathTuple {
  private id: number;
  private folder: string;

  constructor(parent: PathTuple, folder: string, versionedElement: T) {
    super(parent);
    this.folder = folder;
    this.id = versionedElement.id;
  }

  get yllapitoPath(): string {
    return this.folder + "/" + this.id;
  }

  get publicPath(): string {
    return this.folder;
  }
}

class HyvaksymisVaihePaths extends VersionedPaths<HyvaksymisVaihe | HyvaksymisVaiheJulkaisu> {
  get hyvaksymispaatos(): PathTuple {
    return new (class extends PathTuple {
      get publicPath(): string {
        return this.parent.publicPath + "/" + "hyvaksymispaatos";
      }

      get yllapitoPath(): string {
        return this.parent.yllapitoPath + "/" + "hyvaksymispaatos";
      }
    })(this);
  }
}
