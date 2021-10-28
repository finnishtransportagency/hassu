import { DBProjekti } from "../database/model/projekti";
import * as API from "../../../common/graphql/apiModel";
import pickBy from "lodash/pickBy";
import identity from "lodash/identity";
import mergeWith from "lodash/mergeWith";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";

function removeUndefinedFields(object: any) {
  return pickBy(object, identity);
}

export class ProjektiAdapter {
  public adaptProjekti(dbProjekti: DBProjekti): API.Projekti {
    const { kayttoOikeudet, ...fieldsToCopyAsIs } = dbProjekti;
    return {
      __typename: "Projekti",
      tallennettu: !!dbProjekti.tallennettu,
      kayttoOikeudet: new KayttoOikeudetManager(dbProjekti.kayttoOikeudet).getAPIKayttoOikeudet(),
      ...fieldsToCopyAsIs,
    };
  }

  async adaptProjektiToSave(projekti: DBProjekti, changes: API.TallennaProjektiInput): Promise<DBProjekti> {
    // Pick only fields that are relevant to DB
    const { oid, kuvaus, kayttoOikeudet } = changes;
    const kayttoOikeudetManager = new KayttoOikeudetManager(projekti.kayttoOikeudet);
    await kayttoOikeudetManager.applyChanges(kayttoOikeudet);
    return removeUndefinedFields(
      mergeWith(
        {},
        {
          oid,
          kuvaus,
          kayttoOikeudet: kayttoOikeudetManager.getKayttoOikeudet(),
        }
      )
    ) as DBProjekti;
  }
}
