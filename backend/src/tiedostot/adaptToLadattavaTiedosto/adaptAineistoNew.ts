import { AineistoNew } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { adaptFileName, joinPath } from "../paths";
import { getYllapitoSignedDownloadLink } from "./util";

export default async function adaptAineistoNewToLadattavaTiedosto(
  aineisto: AineistoNew,
  aineistoHandletAt: string | true | undefined | null,
  path: string
): Promise<API.LadattavaTiedosto> {
  const { kategoriaId } = aineisto;
  const nimi = aineisto.nimi;
  let linkki;
  if (aineistoHandletAt === true || (aineistoHandletAt?.localeCompare(aineisto.lisatty))) {
    linkki = await getYllapitoSignedDownloadLink(joinPath(path, adaptFileName(aineisto.nimi)));
  } else {
    linkki = "";
  }
  return { __typename: "LadattavaTiedosto", nimi, kategoriaId, linkki, tuotu: aineisto.lisatty };
}
