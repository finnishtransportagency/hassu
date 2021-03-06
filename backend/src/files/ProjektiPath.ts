import { NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu, Vuorovaikutus } from "../database/model";

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
