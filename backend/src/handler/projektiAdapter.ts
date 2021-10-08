import { DBProjekti } from "../database/model/projekti";
import * as API from "../api/apiModel";
import { Status } from "../api/apiModel";

export class ProjektiAdapter {
  public adaptProjekti(dbProjekti: DBProjekti): API.Projekti {
    return { ...dbProjekti } as API.Projekti;
  }

  adaptProjectToSave(projekti: API.TallennaProjektiInput): DBProjekti {
    // Pick only fields that are editable
    return (({ oid, kuvaus }) => ({ oid, kuvaus }))(projekti);
  }

  adaptProjectToCreateNew(velhoProjekti: API.Projekti): DBProjekti {
    const { __typename, tallennettu, ...writableFields } = velhoProjekti;
    return { ...writableFields, status: Status.EI_JULKAISTU };
  }
}
