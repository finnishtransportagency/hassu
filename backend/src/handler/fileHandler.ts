import { fileService } from "../files/fileService";
import {
  LataaKaikkiAineistoQueryVariables,
  LatausTiedot,
  Status,
  ValmisteleTiedostonLatausQueryVariables,
} from "../../../common/graphql/apiModel";
import { projektiDatabase } from "../database/projektiDatabase";
import { IllegalArgumentError } from "../error/IllegalArgumentError";
import { NotFoundError } from "../error/NotFoundError";

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

export async function getAllProjektiFilesForVaiheAsZip({ oid, vaihe, id }: LataaKaikkiAineistoQueryVariables): Promise<string> {
  const projekti = await projektiDatabase.loadProjektiByOid(oid);
  let vaiheenTiedot;
  switch (vaihe) {
    case Status.SUUNNITTELU:
      vaiheenTiedot = id
        ? projekti?.vuorovaikutusKierrosJulkaisut?.find((julkaisu) => julkaisu.id == id)
        : projekti?.vuorovaikutusKierrosJulkaisut?.pop();
      break;
    case Status.NAHTAVILLAOLO:
      vaiheenTiedot = id
        ? projekti?.nahtavillaoloVaiheJulkaisut?.find((julkaisu) => julkaisu.id == id)
        : projekti?.nahtavillaoloVaiheJulkaisut?.pop();
      break;
    case Status.HYVAKSYMISMENETTELYSSA:
      vaiheenTiedot = vaiheenTiedot = id
        ? projekti?.hyvaksymisPaatosVaiheJulkaisut?.find((julkaisu) => julkaisu.id == id)
        : projekti?.hyvaksymisPaatosVaiheJulkaisut?.pop();
      break;
    default:
      throw new IllegalArgumentError("Annettu vaihe ei kelpaa");
  }
  if (!vaiheenTiedot)
    throw new NotFoundError(
      id ? "Vaiheelle en löydetty julkaisua annetulla tunnisteella " + id : "Vaiheelle ei löytynyt viimeisintä julkaisua"
    );
  return await fileService.getAllProjektiFilesForVaiheAsZip(oid, vaihe, vaiheenTiedot);
}
