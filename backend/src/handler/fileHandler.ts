import { fileService } from "../files/fileService";
import { LatausTiedot, ValmisteleTiedostonLatausQueryVariables } from "../../../common/graphql/apiModel";

export async function createUploadURLForFile({
  tiedostoNimi,
  contentType,
}: ValmisteleTiedostonLatausQueryVariables): Promise<LatausTiedot> {
  const fileProperties = await fileService.createUploadURLForFile2(tiedostoNimi, contentType);
  return {
    __typename: "LatausTiedot",
    tiedostoPolku: fileProperties.fileNameWithPath,
    latausLinkki: fileProperties.uploadURL.url,
  };
}
