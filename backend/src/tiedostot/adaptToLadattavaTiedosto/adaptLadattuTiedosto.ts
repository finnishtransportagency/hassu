import * as API from "hassu-common/graphql/apiModel";
import { LadattuTiedosto } from "../../database/model";
import { fileService } from "../../files/fileService";

export default async function adaptLadattuTiedostoToLadattavaTiedosto(
  oid: string,
  tiedosto: LadattuTiedosto
): Promise<API.LadattavaTiedosto> {
  const { jarjestys } = tiedosto;
  const nimi: string = tiedosto.nimi ?? "";
  let linkki;
  if (tiedosto.tuotu) {
    linkki = await fileService.createYllapitoSignedDownloadLink(oid, tiedosto.tiedosto);
  } else {
    linkki = "";
  }
  return { __typename: "LadattavaTiedosto", nimi, jarjestys, linkki, tuotu: tiedosto.tuotu };
}
