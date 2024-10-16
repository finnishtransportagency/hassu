import * as API from "hassu-common/graphql/apiModel";
import { config } from "../../config";
import { LadattuTiedostoNew } from "../../database/model";
import { fileService } from "../../files/fileService";
import { adaptFileName, joinPath } from "../../tiedostot/paths";

export async function adaptLadatutTiedostotWithSizeToAPI({
  tiedostot,
  path,
}: {
  tiedostot: LadattuTiedostoNew[] | undefined | null;
  path: string;
}): Promise<API.LadattuTiedostoNew[] | undefined> {
  if (tiedostot && tiedostot.length > 0) {
    return Promise.all(
      tiedostot.map(async (tiedosto: LadattuTiedostoNew) => {
        const { nimi, lisatty, uuid } = tiedosto;
        const tiedostoPath = joinPath(path, adaptFileName(nimi));
        const apiAineisto: API.LadattuTiedostoNew = {
          __typename: "LadattuTiedostoNew",
          nimi,
          lisatty,
          uuid,
          tiedosto: tiedostoPath,
          koko: await fileService.getFileContentLength(config.yllapitoBucketName, tiedostoPath),
        };

        return apiAineisto;
      })
    );
  }
  return undefined;
}
