import { KuntaVastaanottaja } from "../../../backend/src/database/model";
import * as API from "../../graphql/apiModel";

export function adaptKuntaVastaanottajaToInput(kv: KuntaVastaanottaja): API.KuntaVastaanottajaInput {
  return {
    id: kv.id,
    sahkoposti: kv.sahkoposti,
  };
}
