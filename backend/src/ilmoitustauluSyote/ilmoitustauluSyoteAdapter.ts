import { IlmoitusKuulutus, IlmoitusKuulutusType } from "./ilmoitusKuulutus";
import {
  AloitusKuulutusJulkaisuJulkinen,
  HyvaksymisPaatosVaiheJulkaisuJulkinen,
  Kieli,
  Kielitiedot,
  NahtavillaoloVaiheJulkaisuJulkinen,
  ProjektiJulkinen,
  VelhoJulkinen,
  VuorovaikutusKierrosJulkinen,
} from "../../../common/graphql/apiModel";
import { translate } from "../util/localization";
import { linkAloituskuulutus, linkHyvaksymisPaatos, linkNahtavillaOlo, linkSuunnitteluVaihe } from "../../../common/links";
import { parseDate } from "../util/dateUtil";
import { kuntametadata } from "../../../common/kuntametadata";
import { assertIsDefined } from "../util/assertions";
import { sortedUniq } from "lodash";
import { isKieliTranslatable, KaannettavaKieli } from "../../../common/kaannettavatKielet";
import { assert } from "console";

class IlmoitustauluSyoteAdapter {
  adaptAloitusKuulutusJulkaisu(
    oid: string,
    lyhytOsoite: string | undefined | null,
    aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisuJulkinen,
    kieli: KaannettavaKieli
  ): Omit<IlmoitusKuulutus, "key"> {
    const velho = aloitusKuulutusJulkaisu.velho;
    if (!velho.nimi) {
      throw new Error("velho.nimi puuttuu");
    }
    if (!velho.kunnat) {
      throw new Error("velho.kunnat puuttuu");
    }
    if (!velho.maakunnat) {
      throw new Error("velho.maakunnat puuttuu");
    }
    if (!velho.vaylamuoto) {
      throw new Error("velho.vaylamuoto puuttuu");
    }
    if (!aloitusKuulutusJulkaisu.kielitiedot) {
      throw new Error("aloitusKuulutusJulkaisu.kielitiedot puuttuu");
    }
    if (!aloitusKuulutusJulkaisu.kuulutusPaiva) {
      throw new Error("aloitusKuulutusJulkaisu.kuulutusPaiva puuttuu");
    }
    const nimi = selectNimi(velho.nimi, aloitusKuulutusJulkaisu.kielitiedot, kieli);
    const url = linkAloituskuulutus({ oid, lyhytOsoite: lyhytOsoite || undefined }, kieli);
    return {
      type: IlmoitusKuulutusType.KUULUTUS,
      title: translate("ui-otsikot.kuulutus_suunnitelman_alkamisesta", kieli) + ": " + nimi,
      url,
      ...this.getCommonFields(oid, velho, kieli, aloitusKuulutusJulkaisu.kuulutusPaiva),
    };
  }

  adaptVuorovaikutusKierrosJulkaisu(
    oid: string,
    lyhytOsoite: string | undefined | null,
    vuorovaikutusKierros: VuorovaikutusKierrosJulkinen,
    kieli: KaannettavaKieli,
    kielitiedot: Kielitiedot | null | undefined,
    velho: VelhoJulkinen
  ): Omit<IlmoitusKuulutus, "key"> {
    if (!velho.nimi) {
      throw new Error("velho.nimi puuttuu");
    }
    if (!velho.kunnat) {
      throw new Error("velho.kunnat puuttuu");
    }
    if (!velho.maakunnat) {
      throw new Error("velho.maakunnat puuttuu");
    }
    if (!velho.vaylamuoto) {
      throw new Error("velho.vaylamuoto puuttuu");
    }
    assertIsDefined(kielitiedot, "kielitiedot puuttuu");
    assertIsDefined(vuorovaikutusKierros.vuorovaikutusJulkaisuPaiva, "vuorovaikutusKierros.vuorovaikutusJulkaisuPaiva puuttuu");
    const nimi = selectNimi(velho.nimi, kielitiedot, kieli);
    const url = linkSuunnitteluVaihe({ oid, lyhytOsoite }, kieli);
    return {
      type: IlmoitusKuulutusType.KUULUTUS,
      title: translate("asiakirja.kutsu_vuorovaikutukseen.otsikko", kieli) + ": " + nimi,
      url,
      ...this.getCommonFields(oid, velho, kieli, vuorovaikutusKierros.vuorovaikutusJulkaisuPaiva),
    };
  }

  adaptNahtavillaoloVaihe(
    oid: string,
    lyhytOsoite: string | undefined | null,
    nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisuJulkinen,
    kieli: KaannettavaKieli
  ): Omit<IlmoitusKuulutus, "key"> {
    const velho = nahtavillaoloVaihe.velho;
    if (!velho.nimi) {
      throw new Error("velho.nimi puuttuu");
    }
    if (!velho.kunnat) {
      throw new Error("velho.kunnat puuttuu");
    }
    if (!velho.maakunnat) {
      throw new Error("velho.maakunnat puuttuu");
    }
    if (!velho.vaylamuoto) {
      throw new Error("velho.vaylamuoto puuttuu");
    }
    if (!nahtavillaoloVaihe.kielitiedot) {
      throw new Error("nahtavillaoloVaihe.kielitiedot puuttuu");
    }
    const kuulutusPaiva = nahtavillaoloVaihe.kuulutusPaiva;
    if (!kuulutusPaiva) {
      throw new Error("nahtavillaoloVaihe.kuulutusPaiva puuttuu");
    }
    const nimi = selectNimi(velho.nimi, nahtavillaoloVaihe.kielitiedot, kieli);
    const url = linkNahtavillaOlo({ oid, lyhytOsoite: lyhytOsoite || undefined }, kieli);
    return {
      ...this.getCommonFields(oid, velho, kieli, kuulutusPaiva),
      type: IlmoitusKuulutusType.KUULUTUS,
      title: translate("ui-otsikot.kuulutus_suunnitelman_nahtaville_asettamisesta", kieli) + ": " + nimi,
      url,
    };
  }

  adaptHyvaksymisPaatosVaihe(
    oid: string,
    lyhytOsoite: string | undefined | null,
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisuJulkinen,
    kieli: KaannettavaKieli
  ): Omit<IlmoitusKuulutus, "key"> {
    const velho = hyvaksymisPaatosVaihe.velho;
    if (!velho.nimi) {
      throw new Error("velho.nimi puuttuu");
    }
    if (!velho.kunnat) {
      throw new Error("velho.kunnat puuttuu");
    }
    if (!velho.maakunnat) {
      throw new Error("velho.maakunnat puuttuu");
    }
    if (!velho.vaylamuoto) {
      throw new Error("velho.vaylamuoto puuttuu");
    }
    if (!hyvaksymisPaatosVaihe.kielitiedot) {
      throw new Error("hyvaksymisPaatosVaihe.kielitiedot puuttuu");
    }
    if (!hyvaksymisPaatosVaihe.kuulutusPaiva) {
      throw new Error("hyvaksymisPaatosVaihe.kuulutusPaiva puuttuu");
    }
    const nimi = selectNimi(velho.nimi, hyvaksymisPaatosVaihe.kielitiedot, kieli);
    const url = linkHyvaksymisPaatos({ oid, lyhytOsoite: lyhytOsoite || undefined }, kieli);
    return {
      type: IlmoitusKuulutusType.KUULUTUS,
      title: translate("ui-otsikot.kuulutus_suunnitelman_hyvaksymispaatoksestä", kieli) + ": " + nimi,
      url,
      ...this.getCommonFields(oid, velho, kieli, hyvaksymisPaatosVaihe.kuulutusPaiva),
    };
  }

  private getCommonFields(
    oid: string,
    velho: VelhoJulkinen,
    kieli: Kieli,
    kuulutusPaiva: string
  ): Pick<IlmoitusKuulutus, "oid" | "kunnat" | "maakunnat" | "kieli" | "elyt" | "lelyt" | "date" | "vaylamuoto"> {
    assertIsDefined(velho.maakunnat);
    assertIsDefined(velho.kunnat);
    assertIsDefined(velho.vaylamuoto);
    const maakunnat = velho.maakunnat;
    let elyt = velho.kunnat
      ?.map(kuntametadata.kuntaForKuntaId)
      .map((kunta) => kunta?.ely)
      .filter((m) => !!m) as string[];
    if (elyt) {
      elyt = sortedUniq(elyt);
    }
    const lelyt = velho.kunnat?.map(kuntametadata.liikennevastuuElyIdFromKuntaId).filter((m) => !!m);
    return {
      oid,
      kunnat: velho.kunnat,
      maakunnat,
      elyt,
      lelyt,
      kieli,
      date: parseDate(kuulutusPaiva).format(),
      vaylamuoto: velho.vaylamuoto,
    };
  }

  createKeyForAloitusKuulutusJulkaisu(oid: string, aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisuJulkinen, kieli: Kieli) {
    return [oid, "aloitusKuulutus", kieli, aloitusKuulutusJulkaisu.kuulutusPaiva].join("_");
  }

  createKeyForVuorovaikutusKierrosJulkaisu(oid: string, vuorovaikutusKierros: VuorovaikutusKierrosJulkinen, kieli: Kieli) {
    return [oid, "vuorovaikutuskierros", kieli, vuorovaikutusKierros.vuorovaikutusJulkaisuPaiva].join("_");
  }

  createKeyForNahtavillaoloVaihe(oid: string, nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisuJulkinen, kieli: Kieli) {
    return [oid, "nahtavillaoloVaihe", kieli, nahtavillaoloVaihe.kuulutusPaiva].join("_");
  }

  createKeyForHyvaksymisPaatosVaihe(oid: string, hyvaksymisPaatos: HyvaksymisPaatosVaiheJulkaisuJulkinen, kieli: Kieli) {
    return [oid, "hyvaksymisPaatos", kieli, hyvaksymisPaatos.kuulutusPaiva].join("_");
  }

  public getProjektiKielet(projekti: ProjektiJulkinen): KaannettavaKieli[] {
    const kielitiedot = projekti.kielitiedot;
    if (!kielitiedot) {
      throw new Error("projekti.kielitiedot puuttuu!");
    }
    assert(isKieliTranslatable(kielitiedot.ensisijainenKieli), "Ensisijaisen kielen tulisi olla SUOMI tai RUOTSI");
    const kielet = [kielitiedot.ensisijainenKieli as KaannettavaKieli];
    if (isKieliTranslatable(kielitiedot.toissijainenKieli)) {
      kielet.push(kielitiedot.toissijainenKieli as KaannettavaKieli);
    }
    return kielet;
  }
}

function selectNimi(nimi: string, kielitiedot: Kielitiedot, kieli: Kieli): string {
  if (kielitiedot.ensisijainenKieli == kieli || kielitiedot.toissijainenKieli == kieli) {
    if (kieli == Kieli.SUOMI) {
      return nimi;
    } else {
      const vieraskielinenNimi = kielitiedot.projektinNimiVieraskielella;
      if (!vieraskielinenNimi) {
        throw new Error("kielitiedot.projektinNimiVieraskielella puuttuu");
      }
      return vieraskielinenNimi;
    }
  }
  throw new Error("Valittu kieli ei ole ensisijainen tai toissijainen kieli projektissa!");
}

export const ilmoitusKuulutusAdapter = new IlmoitustauluSyoteAdapter();
