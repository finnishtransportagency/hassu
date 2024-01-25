import { kuntametadata } from "hassu-common/kuntametadata";
import { Velho } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";

export function adaptVelhoJulkinen(velho: Velho): API.VelhoJulkinen {
  const {
    nimi,
    tyyppi,
    kunnat,
    maakunnat,
    suunnittelustaVastaavaViranomainen,
    vaylamuoto,
    asiatunnusVayla,
    asiatunnusELY,
    kuvaus,
    toteuttavaOrganisaatio,
    linkki,
    geoJSON,
  } = velho;
  return {
    __typename: "VelhoJulkinen",
    nimi,
    tyyppi,
    kunnat: kunnat?.map(kuntametadata.idForKuntaName),
    maakunnat: maakunnat?.map(kuntametadata.idForMaakuntaName),
    suunnittelustaVastaavaViranomainen,
    vaylamuoto,
    asiatunnusVayla,
    asiatunnusELY,
    kuvaus,
    toteuttavaOrganisaatio,
    linkki,
    geoJSON,
  };
}
