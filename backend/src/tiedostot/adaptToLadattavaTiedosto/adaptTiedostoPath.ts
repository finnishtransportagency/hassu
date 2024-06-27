import * as API from "hassu-common/graphql/apiModel";
import { fileService } from "../../files/fileService";

/**
 *
 * @param oid Projektin oid
 * @param tiedostoPath tiedoston polku projektin tiedostot tai sisaiset -kansion projektikohtaisen kansion alla
 * @param sisaiset sijaitseeko tiedosto sisaiset-kansiossa
 */
export default async function adaptTiedostoPathToLadattavaTiedosto(oid: string, tiedostoPath: string): Promise<API.LadattavaTiedosto> {
  const linkki = await fileService.createYllapitoSignedDownloadLink(oid, tiedostoPath);
  const nimi = tiedostoPath.split("/").pop() ?? "Tiedosto";
  return { __typename: "LadattavaTiedosto", nimi, linkki };
}
