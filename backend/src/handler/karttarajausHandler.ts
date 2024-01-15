import { TuoKarttarajausQueryVariables } from "hassu-common/graphql/apiModel";
import { fileService } from "../files/fileService";
import { ProjektiPaths } from "../files/ProjektiPath";
import { log } from "../logger";

export const tuoKarttarajaus = async ({ oid, geoJSON }: TuoKarttarajausQueryVariables) => {
  log.error("noninn näys nyt", oid);
  return await fileService.createFileToProjekti({
    oid,
    path: new ProjektiPaths(oid).karttarajaus(),
    fileName: "karttarajaus.geojson",
    contents: Buffer.from(geoJSON, "base64"),
    contentType: "application/geo+json",
  });
};

export const tuoKarttarajausJaHaeTiedot = async (params: TuoKarttarajausQueryVariables) => {
  const string = await tuoKarttarajaus(params);

  //   const {oid, geoJSON} = params

  // TODO Hae tiedot
  return string;
};
