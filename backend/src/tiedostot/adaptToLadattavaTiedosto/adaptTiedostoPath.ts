import * as API from "hassu-common/graphql/apiModel";
import { fileService } from "../../files/fileService";

export default async function adaptTiedostoPathToLadattavaTiedosto(oid: string, tiedostoPath: string): Promise<API.LadattavaTiedosto> {
  const linkki = await fileService.createYllapitoSignedDownloadLink(oid, tiedostoPath);
  const nimi = tiedostoPath.split("/").pop() ?? "Tiedosto";
  return { __typename: "LadattavaTiedosto", nimi, linkki };
}
