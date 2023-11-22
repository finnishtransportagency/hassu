import { MuistutusInput } from "hassu-common/graphql/apiModel";
import { Muistutus } from "../database/model";
import { localDateTimeString } from "../util/dateUtil";
import { uuid } from "hassu-common/util/uuid";

export function adaptMuistutusInput(muistutus: MuistutusInput): Muistutus {
  const aikaleima = localDateTimeString();
  return { ...muistutus, vastaanotettu: aikaleima, id: uuid.v4() };
}
