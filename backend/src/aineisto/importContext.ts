import { DBProjekti } from "../database/model";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";
import { Status } from "hassu-common/graphql/apiModel";
import { projektiAdapter } from "../projekti/adapter/projektiAdapter";
import { ProjektiAineistoManager } from "./ProjektiAineistoManager";

export class ImportContext {
  private readonly dbProjekti: DBProjekti;
  private _julkinenStatus?: Status;
  private _projektiStatus!: Status;
  private readonly _manager: ProjektiAineistoManager;

  constructor(dbProjekti: DBProjekti) {
    this.dbProjekti = dbProjekti;
    this._manager = new ProjektiAineistoManager(dbProjekti);
  }

  async init(): Promise<this> {
    const projektiStatus = (await projektiAdapter.adaptProjekti(this.projekti)).status;
    if (!projektiStatus) {
      throw new Error("Projektin statusta ei voitu määrittää: " + this.oid);
    }
    this._projektiStatus = projektiStatus;
    this._julkinenStatus = (await projektiAdapterJulkinen.adaptProjekti(this.dbProjekti))?.status || undefined;
    return this;
  }

  get projekti(): DBProjekti {
    return this.dbProjekti;
  }

  get oid(): string {
    return this.dbProjekti.oid;
  }

  get julkinenStatus(): Status | undefined {
    return this._julkinenStatus;
  }

  get projektiStatus(): Status {
    return this._projektiStatus;
  }

  get manager(): ProjektiAineistoManager {
    return this._manager;
  }
}
