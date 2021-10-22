import { DBProjekti } from "../database/model/projekti";
import * as API from "../../../common/graphql/apiModel";
import * as _ from "lodash";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";

function removeUndefinedFields(object: any) {
  return _.pickBy(object, _.identity);
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
      _.mergeWith(
        {},
        {
          oid,
          kuvaus,
          kayttoOikeudet: kayttoOikeudetManager.getKayttoOikeudet(),
        }
      )
    ) as DBProjekti;
  }

  mergeProjektiInput(projekti: DBProjekti, input: API.TallennaProjektiInput) {
    return _.mergeWith(projekti, input);
  }
}
