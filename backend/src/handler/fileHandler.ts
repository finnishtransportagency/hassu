import { fileService } from "../files/fileService";
import { LatausTiedot, ValmisteleTiedostonLatausQueryVariables } from "hassu-common/graphql/apiModel";

export async function createUploadURLForFile(
  { tiedostoNimi, contentType }: ValmisteleTiedostonLatausQueryVariables,
  isYllapito: boolean = true
): Promise<LatausTiedot> {
  const fileProperties = await fileService.createUploadURLForFile(tiedostoNimi, contentType, isYllapito);

  return {
    __typename: "LatausTiedot",
    tiedostoPolku: fileProperties.fileNameWithPath,
    latausLinkki: fileProperties.uploadURL,
    latausKentat: fileProperties.uploadFields,
  };
}

export async function createUploadURLForFileJulkinen(variables: ValmisteleTiedostonLatausQueryVariables): Promise<LatausTiedot> {
  return createUploadURLForFile(variables, false);
}
