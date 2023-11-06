import { fileService } from "./fileService";
import { assertIsDefined } from "../util/assertions";
import { localDateTimeString } from "../util/dateUtil";
import { LadattuTiedosto } from "../database/model";

export async function persistLadattuTiedosto({
  oid,
  ladattuTiedosto,
  targetFilePathInProjekti,
  poistetaan,
}: {
  oid: string;
  ladattuTiedosto: LadattuTiedosto | null | undefined;
  targetFilePathInProjekti: string;
  poistetaan: boolean;
}): Promise<{ fileWasRemoved: boolean; fileWasPersisted: boolean }> {
  let fileWasRemoved = false;
  let fileWasPersisted = false;
  if (ladattuTiedosto) {
    if (!ladattuTiedosto.tuotu) {
      const uploadedFile: string = await fileService.persistFileToProjekti({
        uploadedFileSource: ladattuTiedosto.tiedosto,
        oid,
        targetFilePathInProjekti,
      });

      const fileName = uploadedFile.split("/").pop();
      assertIsDefined(fileName, "tiedostonimi pitäisi löytyä aina");
      ladattuTiedosto.tiedosto = uploadedFile;
      ladattuTiedosto.nimi = fileName;
      ladattuTiedosto.tuotu = localDateTimeString();
      fileWasPersisted = true;
    } else if (poistetaan) {
      // Deletoi tiedosto
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: ladattuTiedosto.tiedosto,
        reason: "Käyttäjä poisti tiedoston",
      });
      fileWasRemoved = true;
    }
  }
  return { fileWasRemoved, fileWasPersisted };
}
