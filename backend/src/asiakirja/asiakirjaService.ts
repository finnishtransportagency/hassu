import { AsiakirjaTyyppi, PDF, ProjektiTyyppi } from "../../../common/graphql/apiModel";
import { DBProjekti } from "../database/model/projekti";
import { TieAloitusKuulutusPdf } from "./aloitusKuulutus/tieAloitusKuulutusPdf";
import { RataAloitusKuulutusPdf } from "./aloitusKuulutus/rataAloitusKuulutusPdf";

interface CreatePdfOptions {
  projekti: DBProjekti;
  asiakirjaTyyppi: AsiakirjaTyyppi;
}

export class AsiakirjaService {
  createPdf({ asiakirjaTyyppi, projekti }: CreatePdfOptions): Promise<PDF> {
    let pdf: Promise<PDF>;
    switch (asiakirjaTyyppi) {
      case AsiakirjaTyyppi.ALOITUSKUULUTUS:
        switch (true) {
          case projekti.tyyppi === ProjektiTyyppi.TIE: // Falltrough
          case projekti.tyyppi === ProjektiTyyppi.YLEINEN && projekti.velho?.vaylamuoto?.includes("tie"):
            pdf = new TieAloitusKuulutusPdf(projekti).pdf;
            break;
          case projekti.tyyppi === ProjektiTyyppi.RATA: // Falltrough
          case projekti.tyyppi === ProjektiTyyppi.YLEINEN && projekti.velho?.vaylamuoto?.includes("rata"):
            pdf = new RataAloitusKuulutusPdf(projekti).pdf;
            break;
          default:
            throw new Error(
              `Aloituskuulutuspohjaa ei pystytä päättelemään. tyyppi: '${projekti.tyyppi}', vaylamuoto: '${projekti.velho?.vaylamuoto}'`
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
