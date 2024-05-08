import { LadattuTiedostoNew } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { adaptFileName, joinPath } from "../paths";
import { getYllapitoSignedDownloadLink } from "./util";

export default async function adaptLadattuTiedostoNewToLadattavaTiedosto(
  tiedosto: LadattuTiedostoNew,
  path: string
): Promise<API.LadattavaTiedosto> {
  const { jarjestys, nimi } = tiedosto;
  const linkki = await getYllapitoSignedDownloadLink(joinPath(path, adaptFileName(tiedosto.nimi)));
  return { __typename: "LadattavaTiedosto", nimi, jarjestys, linkki, tuotu: tiedosto.lisatty };
}
