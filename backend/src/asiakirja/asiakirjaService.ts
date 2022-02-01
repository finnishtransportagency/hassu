import { AsiakirjaTyyppi, PDF, ProjektiTyyppi } from "../../../common/graphql/apiModel";
import { DBProjekti } from "../database/model/projekti";
import { AloitusKuulutus10T } from "./suunnittelunAloitus/aloitusKuulutus10T";
import { AloitusKuulutus10R } from "./suunnittelunAloitus/aloitusKuulutus10R";
import { Ilmoitus10T } from "./suunnittelunAloitus/ilmoitus12T";
import { Ilmoitus10R } from "./suunnittelunAloitus/ilmoitus12R";

interface CreatePdfOptions {
  projekti: DBProjekti;
  asiakirjaTyyppi: AsiakirjaTyyppi;
}

enum AsiakirjanMuoto {
  TIE,
  RATA,
}

function determineAsiakirjaMuoto(projekti: DBProjekti): AsiakirjanMuoto {
  if (
    projekti.tyyppi === ProjektiTyyppi.TIE ||
    (projekti.tyyppi === ProjektiTyyppi.YLEINEN && projekti.velho?.vaylamuoto?.includes("tie"))
  ) {
    return AsiakirjanMuoto.TIE;
  } else if (
    projekti.tyyppi === ProjektiTyyppi.RATA ||
    (projekti.tyyppi === ProjektiTyyppi.YLEINEN && projekti.velho?.vaylamuoto?.includes("rata"))
  ) {
    return AsiakirjanMuoto.RATA;
  }
  return null;
}

export class AsiakirjaService {
  createPdf({ asiakirjaTyyppi, projekti }: CreatePdfOptions): Promise<PDF> {
    let pdf: Promise<PDF>;
    const asiakirjanMuoto = determineAsiakirjaMuoto(projekti);

    switch (asiakirjaTyyppi) {
      case AsiakirjaTyyppi.ALOITUSKUULUTUS:
        switch (asiakirjanMuoto) {
          case AsiakirjanMuoto.TIE:
            pdf = new AloitusKuulutus10T(projekti).pdf;
            break;
          case AsiakirjanMuoto.RATA:
            pdf = new AloitusKuulutus10R(projekti).pdf;
            break;
          default:
            throw new Error(
              `Aloituskuulutuspohjaa ei pystytä päättelemään. tyyppi: '${projekti.tyyppi}', vaylamuoto: '${projekti.velho?.vaylamuoto}'`
            );
        }
        break;
      case AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA:
        switch (asiakirjanMuoto) {
          case AsiakirjanMuoto.TIE:
            pdf = new Ilmoitus10T(projekti).pdf;
            break;
          case AsiakirjanMuoto.RATA:
            pdf = new Ilmoitus10R(projekti).pdf;
            break;
          default:
            throw new Error(
              `Ilmoituspohjaa ei pystytä päättelemään. tyyppi: '${projekti.tyyppi}', vaylamuoto: '${projekti.velho?.vaylamuoto}'`
            );
        }
        break;
      default:
        throw new Error(`Asiakirjatyyppi ('${asiakirjaTyyppi}') ei ole vielä tuettu`);
    }
    return pdf;
  }
}

export const asiakirjaService = new AsiakirjaService();
