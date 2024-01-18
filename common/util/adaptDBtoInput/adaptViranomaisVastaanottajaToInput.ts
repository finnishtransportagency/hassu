import { ViranomaisVastaanottaja } from "../../../backend/src/database/model";
import * as API from "../../graphql/apiModel";

export function adaptViranomaisVastaanottajaToInput(vv: ViranomaisVastaanottaja): API.ViranomaisVastaanottajaInput {
  return {
    nimi: vv.nimi,
    sahkoposti: vv.sahkoposti,
  };
}
