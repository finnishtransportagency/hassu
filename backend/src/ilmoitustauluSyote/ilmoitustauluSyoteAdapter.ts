import { IlmoitusKuulutus, IlmoitusKuulutusType } from "./ilmoitusKuulutus";
import {
  AloitusKuulutusJulkaisuJulkinen,
  HyvaksymisPaatosVaiheJulkaisuJulkinen,
  Kieli,
  Kielitiedot,
  NahtavillaoloVaiheJulkaisuJulkinen,
  ProjektiJulkinen,
} from "../../../common/graphql/apiModel";
import { translate } from "../util/localization";
import { linkAloituskuulutus, linkHyvaksymisPaatos, linkSuunnitteluVaihe } from "../../../common/links";
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

  adaptNahtavillaoloVaihe(
    oid: string,
    nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisuJulkinen,
    kieli: Kieli
  ): Omit<IlmoitusKuulutus, "key"> {
    const velho = nahtavillaoloVaihe.velho;
    const nimi = selectNimi(velho.nimi, nahtavillaoloVaihe.kielitiedot, kieli);
    const url = linkSuunnitteluVaihe(oid);
    return {
      oid,
      kunnat: velho.kunnat,
      maakunnat: velho.maakunnat,
      type: IlmoitusKuulutusType.KUULUTUS,
      title: translate("ui-otsikot.kuulutus_suunnitelman_nahtaville_asettamisesta", kieli) + ": " + nimi,
      kieli,
      url,
      vaylamuoto: velho.vaylamuoto,
      date: parseDate(nahtavillaoloVaihe.kuulutusPaiva).format(),
    };
  }

  adaptHyvaksymisPaatosVaihe(
    oid: string,
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisuJulkinen,
    kieli: Kieli
  ): Omit<IlmoitusKuulutus, "key"> {
    const velho = hyvaksymisPaatosVaihe.velho;
    const nimi = selectNimi(velho.nimi, hyvaksymisPaatosVaihe.kielitiedot, kieli);
    const url = linkHyvaksymisPaatos(oid);
    return {
      oid,
      kunnat: velho.kunnat,
      maakunnat: velho.maakunnat,
      type: IlmoitusKuulutusType.KUULUTUS,
      title: translate("ui-otsikot.kuulutus_suunnitelman_hyvaksymispaatoksestä", kieli) + ": " + nimi,
      kieli,
      url,
      vaylamuoto: velho.vaylamuoto,
      date: parseDate(hyvaksymisPaatosVaihe.kuulutusPaiva).format(),
    };
  }

  createKeyForAloitusKuulutusJulkaisu(
    oid: string,
    aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisuJulkinen,
    kieli: Kieli
  ) {
    return [oid, "aloitusKuulutus", kieli, aloitusKuulutusJulkaisu.kuulutusPaiva].join("_");
  }

  createKeyForNahtavillaoloVaihe(oid: string, nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisuJulkinen, kieli: Kieli) {
    return [oid, "nahtavillaoloVaihe", kieli, nahtavillaoloVaihe.kuulutusPaiva].join("_");
  }

  createKeyForHyvaksymisPaatosVaihe(oid: string, hyvaksymisPaatos: HyvaksymisPaatosVaiheJulkaisuJulkinen, kieli: Kieli) {
    return [oid, "hyvaksymisPaatos", kieli, hyvaksymisPaatos.kuulutusPaiva].join("_");
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
