import { fileService } from "./fileService";
import { assertIsDefined } from "../util/assertions";
import { localDateTimeString } from "../util/dateUtil";
import { LadattuTiedosto } from "../database/model";
import { LadattuTiedostoTila, AsiakirjaTyyppi } from "hassu-common/graphql/apiModel";
import { log } from "../logger";

type KasiteltyTiedosto = LadattuTiedosto & { fileWasRemoved: boolean; fileWasPersisted: boolean };
export async function persistLadattuTiedosto({
  oid,
  ladattuTiedosto,
  targetFilePathInProjekti,
  poistetaan,
  asiakirjaTyyppi,
}: {
  oid: string;
  ladattuTiedosto: LadattuTiedosto;
  targetFilePathInProjekti: string;
  poistetaan: boolean;
  asiakirjaTyyppi?: AsiakirjaTyyppi;
}): Promise<KasiteltyTiedosto> {
  let fileWasRemoved = false;
  let fileWasPersisted = false;
  if (!ladattuTiedosto.tuotu || ladattuTiedosto.tila === LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA) {
    log.info("persistoidaan tiedosto", ladattuTiedosto);
    const uploadedFile: string = await fileService.persistFileToProjekti({
      uploadedFileSource: ladattuTiedosto.tiedosto,
      oid,
      targetFilePathInProjekti,
      asiakirjaTyyppi,
    });

    const fileName = uploadedFile.split("/").pop();
    assertIsDefined(fileName, "tiedostonimi pitäisi löytyä aina");
    ladattuTiedosto.tiedosto = uploadedFile;
    ladattuTiedosto.nimi = fileName;
    ladattuTiedosto.tuotu = localDateTimeString();
    ladattuTiedosto.tila = LadattuTiedostoTila.VALMIS;
    fileWasPersisted = true;
  } else if (poistetaan) {
    log.info("poistetaan tiedosto", ladattuTiedosto);
    // Deletoi tiedosto
    await fileService.deleteYllapitoFileFromProjekti({
      oid,
      filePathInProjekti: ladattuTiedosto.tiedosto,
      reason: "Käyttäjä poisti tiedoston",
    });
    fileWasRemoved = true;
  } else {
    log.info("ignoroidaan tiedosto", ladattuTiedosto);
  }

  return { ...ladattuTiedosto, fileWasRemoved, fileWasPersisted };
}
