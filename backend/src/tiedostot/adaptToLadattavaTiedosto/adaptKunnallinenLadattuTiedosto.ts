import { KunnallinenLadattuTiedosto } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { getYllapitoSignedDownloadLink } from "./util";

export default async function adaptKunnallinenLadattuTiedostoToKunnallinenLadattavaTiedosto(
  oid: string,
  tiedosto: KunnallinenLadattuTiedosto,
  path: string
): Promise<API.KunnallinenLadattavaTiedosto> {
  const { jarjestys } = tiedosto;
  const nimi: string = tiedosto.nimi ?? "";
  const linkki = await getYllapitoSignedDownloadLink(path + tiedosto.nimi);
  return { __typename: "KunnallinenLadattavaTiedosto", nimi, jarjestys, linkki, tuotu: tiedosto.lisatty, kunta: tiedosto.kunta };
}
