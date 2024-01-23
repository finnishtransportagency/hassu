import { TuoKarttarajausQueryVariables } from "hassu-common/graphql/apiModel";
import { projektiDatabase } from "../database/projektiDatabase";
import { fileService } from "../files/fileService";
import { ProjektiPaths } from "../files/ProjektiPath";

export const tuoKarttarajaus = async ({ oid, geoJSON }: TuoKarttarajausQueryVariables) => {
  const karttarajaus = await fileService.createFileToProjekti({
    oid,
    path: new ProjektiPaths(oid).karttarajaus(),
    fileName: "karttarajaus.geojson",
    contents: Buffer.from(geoJSON, "utf-8"),
    contentType: "application/geo+json",
  });
  await projektiDatabase.saveProjektiWithoutLocking({ oid, karttarajaus });
};

export const tuoKarttarajausJaHaeTiedot = async (params: TuoKarttarajausQueryVariables) => {
  const string = await tuoKarttarajaus(params);

  // TODO Hae tiedot
  return string;
};
