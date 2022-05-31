import { AsiakirjaTyyppi, Kieli, PDF, ProjektiTyyppi } from "../../../common/graphql/apiModel";
import { AloitusKuulutusJulkaisu, DBProjekti } from "../database/model/projekti";
import { AloitusKuulutus10T } from "./suunnittelunAloitus/aloitusKuulutus10T";
import { AloitusKuulutus10R } from "./suunnittelunAloitus/aloitusKuulutus10R";
import { Ilmoitus12T } from "./suunnittelunAloitus/ilmoitus12T";
import { Ilmoitus12R } from "./suunnittelunAloitus/ilmoitus12R";
import { Kutsu20 } from "./suunnittelunAloitus/Kutsu20";
import { Vuorovaikutus } from "../database/model/suunnitteluVaihe";
import { Kutsu21 } from "./suunnittelunAloitus/Kutsu21";
import { EmailOptions } from "../email/email";

interface CreatePdfOptions {
  projekti?: DBProjekti;
  aloitusKuulutusJulkaisu?: AloitusKuulutusJulkaisu;
  vuorovaikutus?: Vuorovaikutus;
  asiakirjaTyyppi: AsiakirjaTyyppi;
  kieli: Kieli;
  luonnos: boolean;
}

export enum AsiakirjanMuoto {
  TIE,
  RATA,
}

export function determineAsiakirjaMuoto(tyyppi: ProjektiTyyppi, vaylamuoto: string[]): AsiakirjanMuoto | null {
  if (tyyppi === ProjektiTyyppi.TIE || (tyyppi === ProjektiTyyppi.YLEINEN && vaylamuoto?.includes("tie"))) {
    return AsiakirjanMuoto.TIE;
  } else if (tyyppi === ProjektiTyyppi.RATA || (tyyppi === ProjektiTyyppi.YLEINEN && vaylamuoto?.includes("rata"))) {
    return AsiakirjanMuoto.RATA;
  }
  return null;
}

export class AsiakirjaService {
  createPdf({
    projekti,
    asiakirjaTyyppi,
    aloitusKuulutusJulkaisu,
    vuorovaikutus,
    kieli,
    luonnos
  }: CreatePdfOptions): Promise<PDF> {
    let pdf: Promise<PDF>;
    const asiakirjanMuoto = determineAsiakirjaMuoto(
      aloitusKuulutusJulkaisu.velho.tyyppi,
      aloitusKuulutusJulkaisu.velho.vaylamuoto
    );

    switch (asiakirjaTyyppi) {
      case AsiakirjaTyyppi.ALOITUSKUULUTUS:
        switch (asiakirjanMuoto) {
          case AsiakirjanMuoto.TIE:
            pdf = new AloitusKuulutus10T(aloitusKuulutusJulkaisu, kieli).pdf(luonnos);
            break;
          case AsiakirjanMuoto.RATA:
            pdf = new AloitusKuulutus10R(aloitusKuulutusJulkaisu, kieli).pdf(luonnos);
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
            pdf = new Ilmoitus12T(aloitusKuulutusJulkaisu, kieli).pdf(luonnos);
            break;
          case AsiakirjanMuoto.RATA:
            pdf = new Ilmoitus12R(aloitusKuulutusJulkaisu, kieli).pdf(luonnos);
            break;
          default:
            throw new Error(
              `Ilmoituspohjaa ei pystytä päättelemään. tyyppi: '${aloitusKuulutusJulkaisu.velho.tyyppi}', vaylamuoto: '${aloitusKuulutusJulkaisu.velho?.vaylamuoto}'`
            );
        }
        break;
      case AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU:
        switch (asiakirjanMuoto) {
          case AsiakirjanMuoto.TIE:
          case AsiakirjanMuoto.RATA:
            pdf = new Kutsu20(projekti, vuorovaikutus, kieli, asiakirjanMuoto).pdf(luonnos);
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

  createEmail({ projekti, asiakirjaTyyppi, vuorovaikutus, kieli }: CreatePdfOptions): EmailOptions {
    const asiakirjanMuoto = determineAsiakirjaMuoto(projekti.velho.tyyppi, projekti.velho.vaylamuoto);

    switch (asiakirjaTyyppi) {
      case AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU:
        switch (asiakirjanMuoto) {
          case AsiakirjanMuoto.TIE:
          case AsiakirjanMuoto.RATA:
            return new Kutsu21(projekti, vuorovaikutus, kieli, asiakirjanMuoto).createEmail();
          default:
            throw new Error(
              `Ilmoituspohjaa ei pystytä päättelemään. tyyppi: '${projekti.velho.tyyppi}', vaylamuoto: '${projekti.velho?.vaylamuoto}'`
            );
        }
      default:
        throw new Error(`Asiakirjatyyppi ('${asiakirjaTyyppi}') ei ole vielä tuettu`);
    }
  }
}

export const asiakirjaService = new AsiakirjaService();
