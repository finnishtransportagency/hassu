import { AsiakirjaTyyppi, Kieli, PDF, ProjektiTyyppi } from "../../../common/graphql/apiModel";
import { AloitusKuulutusJulkaisu } from "../database/model/projekti";
import { AloitusKuulutus10T } from "./suunnittelunAloitus/aloitusKuulutus10T";
import { AloitusKuulutus10R } from "./suunnittelunAloitus/aloitusKuulutus10R";
import { Ilmoitus12T } from "./suunnittelunAloitus/ilmoitus12T";
import { Ilmoitus12R } from "./suunnittelunAloitus/ilmoitus12R";

interface CreatePdfOptions {
  aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu;
  asiakirjaTyyppi: AsiakirjaTyyppi;
  kieli: Kieli;
}

enum AsiakirjanMuoto {
  TIE,
  RATA,
}

function determineAsiakirjaMuoto(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu): AsiakirjanMuoto | null {
  const tyyppi = aloitusKuulutusJulkaisu.velho.tyyppi;
  const vaylamuoto = aloitusKuulutusJulkaisu.velho?.vaylamuoto;
  if (tyyppi === ProjektiTyyppi.TIE || (tyyppi === ProjektiTyyppi.YLEINEN && vaylamuoto?.includes("tie"))) {
    return AsiakirjanMuoto.TIE;
  } else if (tyyppi === ProjektiTyyppi.RATA || (tyyppi === ProjektiTyyppi.YLEINEN && vaylamuoto?.includes("rata"))) {
    return AsiakirjanMuoto.RATA;
  }
  return null;
}

export class AsiakirjaService {
  createPdf({ asiakirjaTyyppi, aloitusKuulutusJulkaisu, kieli }: CreatePdfOptions): Promise<PDF> {
    let pdf: Promise<PDF>;
    const asiakirjanMuoto = determineAsiakirjaMuoto(aloitusKuulutusJulkaisu);

    switch (asiakirjaTyyppi) {
      case AsiakirjaTyyppi.ALOITUSKUULUTUS:
        switch (asiakirjanMuoto) {
          case AsiakirjanMuoto.TIE:
            pdf = new AloitusKuulutus10T(aloitusKuulutusJulkaisu, kieli).pdf;
            break;
          case AsiakirjanMuoto.RATA:
            pdf = new AloitusKuulutus10R(aloitusKuulutusJulkaisu, kieli).pdf;
            break;
          default:
            throw new Error(
              `Aloituskuulutuspohjaa ei pystytä päättelemään. tyyppi: '${aloitusKuulutusJulkaisu.velho.tyyppi}', vaylamuoto: '${aloitusKuulutusJulkaisu.velho?.vaylamuoto}'`
            );
        }
        break;
      case AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA:
        switch (asiakirjanMuoto) {
          case AsiakirjanMuoto.TIE:
            pdf = new Ilmoitus12T(aloitusKuulutusJulkaisu, kieli).pdf;
            break;
          case AsiakirjanMuoto.RATA:
            pdf = new Ilmoitus12R(aloitusKuulutusJulkaisu, kieli).pdf;
            break;
          default:
            throw new Error(
              `Ilmoituspohjaa ei pystytä päättelemään. tyyppi: '${aloitusKuulutusJulkaisu.velho.tyyppi}', vaylamuoto: '${aloitusKuulutusJulkaisu.velho?.vaylamuoto}'`
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
