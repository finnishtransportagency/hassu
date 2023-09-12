import { fileService } from "../files/fileService";
import { LatausTiedot, ValmisteleTiedostonLatausQueryVariables } from "hassu-common/graphql/apiModel";

export async function createUploadURLForFile({
  tiedostoNimi,
  contentType,
}: ValmisteleTiedostonLatausQueryVariables): Promise<LatausTiedot> {
  const fileProperties = await fileService.createUploadURLForFile(tiedostoNimi, contentType);

  return {
    __typename: "LatausTiedot",
    tiedostoPolku: fileProperties.fileNameWithPath,
    latausLinkki: fileProperties.uploadURL,
    latausKentat: fileProperties.uploadFields,
  };
}
