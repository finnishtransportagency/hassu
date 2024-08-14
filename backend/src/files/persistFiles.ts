import { fileService } from "./fileService";
import { assertIsDefined } from "../util/assertions";
import { localDateTimeString } from "../util/dateUtil";
import { LadattuTiedosto } from "../database/model";
import { LadattuTiedostoTila, AsiakirjaTyyppi, Kieli } from "hassu-common/graphql/apiModel";

export async function persistLadattuTiedosto({
  oid,
  ladattuTiedosto,
  targetFilePathInProjekti,
  asiakirjaTyyppi,
  kieli,
}: {
  oid: string;
  ladattuTiedosto: LadattuTiedosto;
  targetFilePathInProjekti: string;
  asiakirjaTyyppi?: AsiakirjaTyyppi;
  kieli?: Kieli;
}): Promise<LadattuTiedosto> {
  const uploadedFile: string = await fileService.persistFileToProjekti({
    uploadedFileSource: ladattuTiedosto.tiedosto,
    oid,
    targetFilePathInProjekti,
    asiakirjaTyyppi,
    kieli,
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
  if (tiedosto.tiedosto) {
    await fileService.deleteYllapitoFileFromProjekti({
      oid,
      filePathInProjekti: tiedosto.tiedosto,
      reason: "Käyttäjä poisti tiedoston",
    });
  }
}
