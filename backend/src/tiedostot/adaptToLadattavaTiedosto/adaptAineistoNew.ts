import { AineistoNew } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { fileService } from "../../files/fileService";
import { joinPath } from "../paths";

export default async function adaptAineistoNewToLadattavaTiedosto(
  oid: string,
  aineisto: AineistoNew,
  aineistoHandletAt: string | true | undefined | null,
  path: string
): Promise<API.LadattavaTiedosto> {
  const { jarjestys, kategoriaId } = aineisto;
  const nimi = aineisto.nimi;
  let linkki;
  if (aineistoHandletAt === true || (aineistoHandletAt && aineistoHandletAt.localeCompare(aineisto.lisatty))) {
    linkki = await fileService.createYllapitoSignedDownloadLink(oid, joinPath(path, encodeURIComponent(aineisto.nimi)));
  } else {
    linkki = "";
  }
  return { __typename: "LadattavaTiedosto", nimi, jarjestys, kategoriaId, linkki, tuotu: aineisto.lisatty };
}
