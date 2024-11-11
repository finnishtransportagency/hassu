import { IlmoitusKuulutus, IlmoitusKuulutusType } from "./ilmoitusKuulutus";
import {
  AloitusKuulutusJulkaisuJulkinen,
  Kieli,
  Kielitiedot,
  ProjektiJulkinen,
  VelhoJulkinen,
  VuorovaikutusJulkinen,
} from "hassu-common/graphql/apiModel";
import { translate } from "../util/localization";
import { linkSuunnitteluVaihe } from "hassu-common/links";
import { parseDate } from "../util/dateUtil";
import { kuntametadata } from "hassu-common/kuntametadata";
import { assertIsDefined } from "../util/assertions";
import { sortedUniq } from "lodash";

type LyhytOsoite = string | undefined | null;

export type JulkaisuVaiheIndexPart =
  | "aloitusKuulutus"
  | "vuorovaikutuskierros"
  | "nahtavillaoloVaihe"
  | "hyvaksymisPaatos"
  | "jatkopaatos1"
  | "jatkopaatos2";

export type GenericKuulutusJulkaisuJulkinen = Pick<
  AloitusKuulutusJulkaisuJulkinen,
  "velho" | "kielitiedot" | "kuulutusPaiva" | "tila" | "kopioituToiseltaProjektilta"
>;

class IlmoitustauluSyoteAdapter {
  adaptKuulutusJulkaisu(
    oid: string,
    url: string,
    kuulutusJulkaisu: GenericKuulutusJulkaisuJulkinen,
    kieli: Kieli,
    uiOtsikkoPath: string
  ): Omit<IlmoitusKuulutus, "key"> {
    const velho = kuulutusJulkaisu.velho;
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
    if (!kuulutusJulkaisu.kielitiedot) {
      throw new Error("kielitiedot puuttuu");
    }
    if (!kuulutusJulkaisu.kuulutusPaiva) {
      throw new Error("kuulutusPaiva puuttuu");
    }
    const nimi = selectNimi(velho.nimi, kuulutusJulkaisu.kielitiedot, kieli);
    return {
      type: IlmoitusKuulutusType.KUULUTUS,
      title: getTitle(kieli, nimi, uiOtsikkoPath),
      url,
      ...this.getCommonFields(oid, velho, kieli, kuulutusJulkaisu.kuulutusPaiva),
    };

    function getTitle(kieli: Kieli, nimi: string, uiOtsikkoPath: string) {
      // TODO: replace these with strings = the actual translations, do not use translate function
      switch (kieli) {
        case Kieli.RUOTSI:
          return translate(uiOtsikkoPath, kieli) + ": " + nimi;
        default:
          //SUOMI JA SAAME
          return translate(uiOtsikkoPath, Kieli.SUOMI) + ": " + nimi;
      }
    }
  }

  adaptVuorovaikutusKierrosJulkaisu(
    oid: string,
    lyhytOsoite: LyhytOsoite,
    vuorovaikutus: VuorovaikutusJulkinen,
    kieli: Kieli,
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
    assertIsDefined(vuorovaikutus.vuorovaikutusJulkaisuPaiva, "vuorovaikutusKierros.vuorovaikutusJulkaisuPaiva puuttuu");
    const nimi = selectNimi(velho.nimi, kielitiedot, kieli);
    const url = linkSuunnitteluVaihe({ oid, lyhytOsoite }, kieli);
    return {
      type: IlmoitusKuulutusType.KUULUTUS,
      title: getTitle(kieli, nimi),
      url,
      ...this.getCommonFields(oid, velho, kieli, vuorovaikutus.vuorovaikutusJulkaisuPaiva),
    };

    function getTitle(kieli: Kieli, nimi: string) {
      // TODO: replace these with strings = the actual translations, do not use translate function
      switch (kieli) {
        case Kieli.RUOTSI:
          return translate("asiakirja.kutsu_vuorovaikutukseen.otsikko", kieli) + ": " + nimi;
        default:
          //SUOMI JA SAAME
          return translate("asiakirja.kutsu_vuorovaikutukseen.otsikko", Kieli.SUOMI) + ": " + nimi;
      }
    }
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

  createKeyForJulkaisu(oid: string, vaihe: JulkaisuVaiheIndexPart, julkaisuPaiva: string | undefined | null = "", kieli: Kieli) {
    return [oid, vaihe, kieli, julkaisuPaiva].join("_");
  }

  public getProjektiKielet(projekti: ProjektiJulkinen): Kieli[] {
    const kielitiedot = projekti.kielitiedot;
    if (!kielitiedot) {
      throw new Error("projekti.kielitiedot puuttuu!");
    }
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
