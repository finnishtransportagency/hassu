import { fileService } from "../files/fileService";
import { LataaLisaAineistoQueryVariables, LatausTiedot, ValmisteleTiedostonLatausQueryVariables } from "../../../common/graphql/apiModel";
import { projektiDatabase } from "../database/projektiDatabase";
import { NotFoundError } from "../error/NotFoundError";
import { IllegalArgumentError } from "../error/IllegalArgumentError";

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

export async function getLisaAineistoFilesAsZip({ oid, id }: LataaLisaAineistoQueryVariables): Promise<string> {
  const projekti = await projektiDatabase.loadProjektiByOid(oid);
  const julkaisu = id ? projekti?.nahtavillaoloVaiheJulkaisut?.find((julkaisu) => julkaisu.id == id) : undefined;
  if (!julkaisu) throw new NotFoundError("Nähtävilläolovaiheelle ei löydetty julkaisua annetulla tunnisteella " + id);
  const tiedostot: string[] = [];
  julkaisu.aineistoNahtavilla?.forEach((a) => {
    if (a.tiedosto) tiedostot.push(a.tiedosto);
  });
  julkaisu.lisaAineisto?.forEach((a) => {
    if (a.tiedosto) tiedostot.push(a.tiedosto);
  });

  if (!tiedostot) throw new IllegalArgumentError("Annettu vaihe tai vaiheen tiedot ei kelpaa");
  return await fileService.getProjektiFilesAsZip(oid, tiedostot, "LISÄAINEISTO");
}
