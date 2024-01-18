import { Aineisto } from "../../../backend/src/database/model";
import * as API from "../../graphql/apiModel";

export function adaptAineistoToInput(aineisto: Aineisto): API.AineistoInput {
  return {
    nimi: aineisto.nimi,
    tila: aineisto.tila,
    dokumenttiOid: aineisto.dokumenttiOid,
    uuid: aineisto.uuid,
    kategoriaId: aineisto.kategoriaId,
  };
}
