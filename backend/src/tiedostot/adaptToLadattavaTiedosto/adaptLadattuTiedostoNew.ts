import { LadattuTiedostoNew } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { fileService } from "../../files/fileService";

export default async function adaptLadattuTiedostoNewToLadattavaTiedosto(
  oid: string,
  tiedosto: LadattuTiedostoNew,
  path: string
): Promise<API.LadattavaTiedosto> {
  const { jarjestys, nimi } = tiedosto;
  const linkki = await fileService.createYllapitoSignedDownloadLink(oid, path + tiedosto.nimi);
  return { __typename: "LadattavaTiedosto", nimi, jarjestys, linkki, tuotu: tiedosto.lisatty };
}
