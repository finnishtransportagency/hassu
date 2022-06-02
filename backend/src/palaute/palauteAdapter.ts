import { Palaute } from "../database/model/suunnitteluVaihe";
import { PalauteInput } from "../../../common/graphql/apiModel";
import { uuid } from "../util/uuid";
import { localDateTimeString } from "../util/dateUtil";

export function adaptPalauteInput(palaute: PalauteInput): Palaute {
  const aikaleima = localDateTimeString();
  return { ...palaute, vastaanotettu: aikaleima, id: uuid.v4() };
}
