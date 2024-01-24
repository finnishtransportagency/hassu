import { kuntametadata } from "hassu-common/kuntametadata";
import { adaptLinkitetytProjektitByAddingTypename } from ".";
import { Velho } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";

export function adaptVelhoToAPI(velho: Velho | null | undefined): API.Velho {
  return {
    __typename: "Velho",
    ...velho,
    linkitetytProjektit: adaptLinkitetytProjektitByAddingTypename(velho?.linkitetytProjektit),
    kunnat: velho?.kunnat?.map(kuntametadata.idForKuntaName),
    maakunnat: velho?.maakunnat?.map(kuntametadata.idForMaakuntaName),
  };
}
