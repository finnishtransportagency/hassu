import { fileService } from "../files/fileService";
import { LatausTiedot } from "../../../common/graphql/apiModel";

export async function createUploadURLForFile(fileName: string): Promise<LatausTiedot> {
  const fileProperties = await fileService.createUploadURLForFile(fileName);
  return {
    __typename: "LatausTiedot",
    tiedostoPolku: fileProperties.fileNameWithPath,
    latausLinkki: fileProperties.uploadURL,
  };
}
