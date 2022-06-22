import { AsiakirjaTyyppi, Kieli, PDF, ProjektiTyyppi } from "../../../common/graphql/apiModel";
import { AloitusKuulutusJulkaisu, DBProjekti, NahtavillaoloVaihe } from "../database/model";
import { AloitusKuulutus10T } from "./suunnittelunAloitus/aloitusKuulutus10T";
import { AloitusKuulutus10R } from "./suunnittelunAloitus/aloitusKuulutus10R";
import { Ilmoitus12T } from "./suunnittelunAloitus/ilmoitus12T";
import { Ilmoitus12R } from "./suunnittelunAloitus/ilmoitus12R";
import { Kutsu20 } from "./suunnittelunAloitus/Kutsu20";
import { Vuorovaikutus } from "../database/model/";
import { Kutsu21 } from "./suunnittelunAloitus/Kutsu21";
import { EmailOptions } from "../email/email";
import { Kutsu30 } from "./suunnittelunAloitus/Kutsu30";
import { kirjaamoOsoitteetService } from "../kirjaamoOsoitteet/kirjaamoOsoitteetService";

interface CreateNahtavillaoloKuulutusPdfOptions {
  projekti: DBProjekti;
  nahtavillaoloVaihe: NahtavillaoloVaihe;
  kieli: Kieli;
  luonnos: boolean;
}

interface YleisotilaisuusKutsuPdfOptions {
  projekti: DBProjekti;
  vuorovaikutus: Vuorovaikutus;
  kieli: Kieli;
  luonnos: boolean;
}

interface AloituskuulutusPdfOptions {
  aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu;
  asiakirjaTyyppi: AsiakirjaTyyppi;
  kieli: Kieli;
  luonnos: boolean;
}

export enum AsiakirjanMuoto {
  TIE = "TIE",
  RATA = "RATA",
}

export function determineAsiakirjaMuoto(tyyppi: ProjektiTyyppi, vaylamuoto: string[]): AsiakirjanMuoto | undefined {
  if (tyyppi === ProjektiTyyppi.TIE || (tyyppi === ProjektiTyyppi.YLEINEN && vaylamuoto?.includes("tie"))) {
    return AsiakirjanMuoto.TIE;
  } else if (tyyppi === ProjektiTyyppi.RATA || (tyyppi === ProjektiTyyppi.YLEINEN && vaylamuoto?.includes("rata"))) {
    return AsiakirjanMuoto.RATA;
  }
  throw new Error("Asiakirjan muotoa ei voitu päätellä");
}

export class AsiakirjaService {
  createAloituskuulutusPdf({
    asiakirjaTyyppi,
    aloitusKuulutusJulkaisu,
    kieli,
    luonnos,
  }: AloituskuulutusPdfOptions): Promise<PDF> {
    let pdf: Promise<PDF>;
    const asiakirjanMuoto: AsiakirjanMuoto | undefined = determineAsiakirjaMuoto(
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
              `Aloituskuulutuspohjaa ei pystytä päättelemään. asiakirjanMuoto:'${asiakirjanMuoto}' tyyppi: '${aloitusKuulutusJulkaisu.velho.tyyppi}', vaylamuoto: '${aloitusKuulutusJulkaisu.velho?.vaylamuoto}'`
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
      default:
        throw new Error(`Asiakirjatyyppi ('${asiakirjaTyyppi}') ei ole vielä tuettu`);
    }
    return pdf;
  }

  createYleisotilaisuusKutsuPdf({
    projekti,
    vuorovaikutus,
    kieli,
    luonnos,
  }: YleisotilaisuusKutsuPdfOptions): Promise<PDF> {
    const asiakirjanMuoto = determineAsiakirjaMuoto(projekti?.velho?.tyyppi, projekti?.velho?.vaylamuoto);
    return new Kutsu20(projekti, vuorovaikutus, kieli, asiakirjanMuoto).pdf(luonnos);
  }

  async createNahtavillaoloKuulutusPdf({
    projekti,
    nahtavillaoloVaihe,
    kieli,
    luonnos,
  }: CreateNahtavillaoloKuulutusPdfOptions): Promise<PDF> {
    const asiakirjanMuoto = determineAsiakirjaMuoto(projekti?.velho?.tyyppi, projekti?.velho?.vaylamuoto);

    return new Kutsu30(
      projekti,
      nahtavillaoloVaihe,
      kieli,
      asiakirjanMuoto,
      await kirjaamoOsoitteetService.listKirjaamoOsoitteet()
    ).pdf(luonnos);
  }

  createYleisotilaisuusKutsuEmail({ projekti, vuorovaikutus, kieli }: YleisotilaisuusKutsuPdfOptions): EmailOptions {
    const asiakirjanMuoto = determineAsiakirjaMuoto(projekti.velho.tyyppi, projekti.velho.vaylamuoto);
    return new Kutsu21(projekti, vuorovaikutus, kieli, asiakirjanMuoto).createEmail();
  }
}

export const asiakirjaService = new AsiakirjaService();
