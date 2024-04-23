import { LadattuTiedostoNew } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { fileService } from "../../files/fileService";
import { joinPath } from "../paths";

export default async function adaptLadattuTiedostoNewToLadattavaTiedosto(
  oid: string,
  tiedosto: LadattuTiedostoNew,
  path: string
): Promise<API.LadattavaTiedosto> {
  const { jarjestys, nimi } = tiedosto;
  const linkki = await fileService.createYllapitoSignedDownloadLink(oid, joinPath(path, encodeURIComponent(tiedosto.nimi)));
  return { __typename: "LadattavaTiedosto", nimi, jarjestys, linkki, tuotu: tiedosto.lisatty };
}
