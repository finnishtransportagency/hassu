import { AineistoTila, HyvaksymisEsitysLadattavaTiedosto, LadattavaTiedosto, LadattavatTiedostot } from "hassu-common/graphql/apiModel";
import crypto from "crypto";
import { Aineisto, DBProjekti, HyvaksymisEsitysLadattuTiedosto, LadattuTiedosto } from "../../database/model";
import { log } from "../../logger";
import { fileService } from "../../files/fileService";

export default abstract class TiedostoDownloadLinkService<VAIHE, TALLENNAINPUT, LISTAAINPUT> {
  protected async adaptAineistoToLadattavaTiedosto(oid: string, aineisto: Aineisto): Promise<LadattavaTiedosto> {
    const { jarjestys, kategoriaId } = aineisto;
    const nimi = aineisto.nimi;
    let linkki;
    if (aineisto.tila == AineistoTila.VALMIS) {
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

  protected async adaptLadattuTiedostoToLadattavaTiedosto(oid: string, tiedosto: LadattuTiedosto): Promise<LadattavaTiedosto> {
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

  protected async adaptHyvaksymisEsitysLadattuTiedostoToLadattavaTiedosto(
    oid: string,
    tiedosto: HyvaksymisEsitysLadattuTiedosto
  ): Promise<HyvaksymisEsitysLadattavaTiedosto> {
    const { jarjestys } = tiedosto;
    const nimi: string = tiedosto.nimi ?? "";
    let linkki;
    if (tiedosto.tuotu) {
      linkki = await fileService.createYllapitoSignedDownloadLink(oid, tiedosto.tiedosto);
    } else {
      linkki = "";
    }
    return { __typename: "HyvaksymisEsitysLadattavaTiedosto", nimi, jarjestys, linkki, tuotu: tiedosto.tuotu, kunta: tiedosto.kunta };
  }

  protected async adaptTiedostoPathToLadattavaTiedosto(oid: string, tiedostoPath: string): Promise<LadattavaTiedosto> {
    const linkki = await fileService.createYllapitoSignedDownloadLink(oid, tiedostoPath);
    const nimi = tiedostoPath.split("/").pop() ?? "Tiedosto";
    return { __typename: "LadattavaTiedosto", nimi, linkki };
  }

  generateSalt() {
    return crypto.randomBytes(16).toString("hex");
  }

  abstract generateHash(oid: string, uuidOrSecret: string, salt: string | undefined): string;
  abstract validateHash(oid: string, salt: string, givenHash: string, vaihe: VAIHE): void;
  abstract esikatseleTiedostot(projekti: DBProjekti, projektiInput: TALLENNAINPUT): Promise<LadattavatTiedostot>;
  abstract listaaTiedostot(projekti: DBProjekti, params: LISTAAINPUT): Promise<LadattavatTiedostot>;
}
