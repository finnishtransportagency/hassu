import * as API from "hassu-common/graphql/apiModel";
import crypto from "crypto";
import { DBProjekti } from "../../database/model";
export default abstract class TiedostoDownloadLinkService<TALLENNAINPUT, LISTAAINPUT> {
  generateSalt() {
    return crypto.randomBytes(16).toString("hex");
  }

  abstract esikatseleTiedostot(projekti: DBProjekti, projektiInput: TALLENNAINPUT): Promise<API.LadattavatTiedostot>;
  abstract listaaTiedostot(projekti: DBProjekti, params: LISTAAINPUT): Promise<API.LadattavatTiedostot>;
}
