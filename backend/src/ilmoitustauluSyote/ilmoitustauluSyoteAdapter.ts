import { IlmoitusKuulutus, IlmoitusKuulutusType } from "./ilmoitusKuulutus";
import {
  AloitusKuulutusJulkaisuJulkinen,
  Kieli,
  Kielitiedot,
  ProjektiJulkinen,
} from "../../../common/graphql/apiModel";
import { translate } from "../util/localization";
import { linkAloituskuulutus } from "../../../common/links";
import { parseDate } from "../util/dateUtil";

class IlmoitustauluSyoteAdapter {
  adaptAloitusKuulutusJulkaisu(
    oid: string,
    aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisuJulkinen,
    kieli: Kieli
  ): Omit<IlmoitusKuulutus, "key"> {
    const velho = aloitusKuulutusJulkaisu.velho;
    const nimi = selectNimi(velho.nimi, aloitusKuulutusJulkaisu.kielitiedot, kieli);
    const url = linkAloituskuulutus(oid);
    return {
      oid,
      kunnat: velho.kunnat,
      maakunnat: velho.maakunnat,
      type: IlmoitusKuulutusType.KUULUTUS,
      title: translate("ui-otsikot.kuulutus_suunnitelman_alkamisesta", kieli) + ": " + nimi,
      kieli,
      url,
      vaylamuoto: velho.vaylamuoto,
      date: parseDate(aloitusKuulutusJulkaisu.kuulutusPaiva).format(),
    };
  }

  createKeyForAloitusKuulutusJulkaisu(
    oid: string,
    aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisuJulkinen,
    kieli: Kieli
  ) {
    return [oid, "aloitusKuulutus", kieli, aloitusKuulutusJulkaisu.kuulutusPaiva].join("_");
  }

  public getProjektiKielet(projekti: ProjektiJulkinen): Kieli[] {
    const kielitiedot = projekti.kielitiedot;
    const kielet = [kielitiedot.ensisijainenKieli];
    if (kielitiedot.toissijainenKieli) {
      kielet.push(kielitiedot.toissijainenKieli);
    }
    return kielet;
  }
}

function selectNimi(nimi: string, kielitiedot: Kielitiedot, kieli: Kieli): string {
  if (kielitiedot.ensisijainenKieli == kieli || kielitiedot.toissijainenKieli == kieli) {
    if (kieli == Kieli.SUOMI) {
      return nimi;
    } else {
      return kielitiedot.projektinNimiVieraskielella;
    }
  }
}

export const ilmoitusKuulutusAdapter = new IlmoitustauluSyoteAdapter();
