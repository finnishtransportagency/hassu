import { Palaute } from "../database/model/suunnitteluVaihe";
import { PalauteInput } from "../../../common/graphql/apiModel";
import { uuid } from "../util/uuid";

export function adaptPalauteInput(palaute: PalauteInput): Palaute {
  return { ...palaute, id: uuid.v4() };
}
