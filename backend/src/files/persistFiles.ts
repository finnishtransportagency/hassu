import { fileService } from "./fileService";
import { assertIsDefined } from "../util/assertions";
import { localDateTimeString } from "../util/dateUtil";
import { LadattuTiedosto } from "../database/model";
import { LadattuTiedostoTila, AsiakirjaTyyppi } from "hassu-common/graphql/apiModel";

export async function persistLadattuTiedosto({
  oid,
  ladattuTiedosto,
  targetFilePathInProjekti,
  asiakirjaTyyppi,
}: {
  oid: string;
  ladattuTiedosto: LadattuTiedosto;
  targetFilePathInProjekti: string;
  asiakirjaTyyppi?: AsiakirjaTyyppi;
}): Promise<LadattuTiedosto> {
  const uploadedFile: string = await fileService.persistFileToProjekti({
    uploadedFileSource: ladattuTiedosto.tiedosto,
    oid,
    targetFilePathInProjekti,
    asiakirjaTyyppi,
  });

  const fileName = uploadedFile.split("/").pop();
  assertIsDefined(fileName, "tiedostonimi pitäisi löytyä aina");
  return {
    ...ladattuTiedosto,
    tiedosto: uploadedFile,
    nimi: fileName,
    tuotu: localDateTimeString(),
    tila: LadattuTiedostoTila.VALMIS,
  };
}

export async function deleteFile({ oid, tiedosto }: { oid: string; tiedosto: LadattuTiedosto }) {
  assertIsDefined(tiedosto.tiedosto, "poistettavalla tiedostolla on oltava tiedosto tiedossa");
  await fileService.deleteYllapitoFileFromProjekti({
    oid,
    filePathInProjekti: tiedosto.tiedosto,
    reason: "Käyttäjä poisti tiedoston",
  });
}
