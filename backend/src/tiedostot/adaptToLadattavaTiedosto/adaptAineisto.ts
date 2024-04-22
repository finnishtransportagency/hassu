import { Aineisto } from "../../database/model";
import { fileService } from "../../files/fileService";
import { log } from "../../logger";
import * as API from "hassu-common/graphql/apiModel";

export default async function adaptAineistoToLadattavaTiedosto(oid: string, aineisto: Aineisto): Promise<API.LadattavaTiedosto> {
  const { jarjestys, kategoriaId } = aineisto;
  const nimi = aineisto.nimi;
  let linkki;
  if (aineisto.tila == API.AineistoTila.VALMIS) {
    if (!aineisto.tiedosto) {
      const msg = `Virhe tiedostojen listaamisessa: Aineistolta (nimi: ${nimi}, dokumenttiOid: ${aineisto.dokumenttiOid}) puuttuu tiedosto!`;
      log.error(msg, { aineisto });
      throw new Error(msg);
    }
    linkki = await fileService.createYllapitoSignedDownloadLink(oid, aineisto.tiedosto);
  } else {
    linkki = "";
  }
  return { __typename: "LadattavaTiedosto", nimi, jarjestys, kategoriaId, linkki, tuotu: aineisto.tuotu };
}
