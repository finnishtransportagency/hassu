// noinspection JSUnusedGlobalSymbols

import { DBProjekti, DBVaylaUser, Kielitiedot, LocalizedMap, SuunnitteluSopimusJulkaisu, Velho, Yhteystieto } from "../../database/model";
import { KayttajaTyyppi, Kieli, ProjektiTyyppi, Viranomainen } from "../../../../common/graphql/apiModel";
import { AsiakirjanMuoto, determineAsiakirjaMuoto } from "../asiakirjaTypes";
import { translate } from "../../util/localization";
import { kuntametadata } from "../../../../common/kuntametadata";
import { assertIsDefined } from "../../util/assertions";
import { linkAloituskuulutus, linkAloituskuulutusYllapito, linkHyvaksymisPaatos, linkSuunnitteluVaihe } from "../../../../common/links";
import { vaylaUserToYhteystieto, yhteystietoPlusKunta } from "../../util/vaylaUserToYhteystieto";
import { formatProperNoun } from "../../../../common/util/formatProperNoun";
import { formatNimi } from "../../util/userUtil";
import { getAsiatunnus } from "../../projekti/projektiUtil";

export interface CommonKutsuAdapterProps {
  oid: string;
  velho: Velho;
  kielitiedot?: Kielitiedot | null;
  kieli: Kieli;
  kayttoOikeudet?: DBVaylaUser[];
  hankkeenKuvaus?: LocalizedMap<string>;
}

/**
 * Poimii annetusta objektista vain CommonKutsuAdapterProps:ssa esitellyt kentät
 */
export function pickCommonAdapterProps(projekti: DBProjekti, hankkeenKuvaus: LocalizedMap<string>, kieli: Kieli): CommonKutsuAdapterProps {
  const { oid, kielitiedot, velho, kayttoOikeudet } = projekti;
  assertIsDefined(velho);
  return { oid, kielitiedot, velho, kayttoOikeudet, kieli, hankkeenKuvaus };
}

export type LokalisoituYhteystieto = Omit<Yhteystieto, "organisaatio" | "kunta"> & { organisaatio: string };

export class CommonKutsuAdapter {
  readonly velho: Velho;
  readonly kieli: Kieli;
  readonly asiakirjanMuoto: AsiakirjanMuoto;
  readonly oid: string;
  readonly projektiTyyppi: ProjektiTyyppi;
  readonly kayttoOikeudet?: DBVaylaUser[];
  readonly kielitiedot: Kielitiedot;
  private templateResolvers: unknown[] = [];
  readonly hankkeenKuvausParam?: LocalizedMap<string>;

  constructor(params: CommonKutsuAdapterProps) {
    const { oid, velho, kielitiedot, kieli, kayttoOikeudet } = params;
    this.oid = oid;
    this.velho = velho;
    assertIsDefined(kielitiedot, "adaptNahtavillaoloVaiheJulkaisut: julkaisu.kielitiedot määrittelemättä");

    this.kielitiedot = kielitiedot;
    this.kieli = kieli;
    assertIsDefined(velho.tyyppi, "velho.tyyppi ei ole määritelty");

    this.projektiTyyppi = velho.tyyppi;
    this.kayttoOikeudet = kayttoOikeudet;
    this.asiakirjanMuoto = determineAsiakirjaMuoto(velho?.tyyppi, velho?.vaylamuoto);
    this.hankkeenKuvausParam = params.hankkeenKuvaus;
  }

  addTemplateResolver(value: unknown): void {
    this.templateResolvers.push(value);
  }

  get title(): string {
    return this.nimi;
  }

  hankkeenKuvaus(): string | undefined {
    assertIsDefined(this.hankkeenKuvausParam);
    return this.hankkeenKuvausParam[this.kieli];
  }

  get subject(): string {
    return {
      [AsiakirjanMuoto.TIE]: "SUUNNITELMAN LAATIJAN KUTSUSTA YLEISÖTILAISUUTEEN ILMOITTAMINEN",
      [AsiakirjanMuoto.RATA]: "",
    }[this.asiakirjanMuoto];
  }

  get tilaajaOrganisaatio(): string {
    const suunnittelustaVastaavaViranomainen = this.velho.suunnittelustaVastaavaViranomainen;
    return (
      translate("viranomainen." + suunnittelustaVastaavaViranomainen, this.kieli) || "<Suunnittelusta vastaavan viranomaisen tieto puuttuu>"
    );
  }

  get viranomainen(): string {
    if (this.asiakirjanMuoto !== AsiakirjanMuoto.RATA) {
      const kaannos: string = translate("viranomainen.VAYLAVIRASTO", this.kieli) || "";
      if (!kaannos) {
        throw new Error("Käännös puuttuu VAYLAVIRASTO:lle!");
      }
      return kaannos;
    }
    return this.tilaajaOrganisaatio;
  }

  get tilaajaOrganisaatiota(): string {
    const suunnittelustaVastaavaViranomainen = this.velho.suunnittelustaVastaavaViranomainen;
    const kaannos: string = translate("viranomainen." + suunnittelustaVastaavaViranomainen, this.kieli) || "";
    if (!kaannos) {
      throw new Error(`Käänbös puuttuu viranomainen.${suunnittelustaVastaavaViranomainen}:lle!`);
    }
    return kaannos.replace("keskus", "keskusta").replace("virasto", "virastoa");
  }

  get tilaajaOrganisaatiolle(): string {
    const suunnittelustaVastaavaViranomainen = this.velho.suunnittelustaVastaavaViranomainen;
    const kaannos: string = translate("viranomainen." + suunnittelustaVastaavaViranomainen, this.kieli) || "";
    if (!kaannos) {
      throw new Error(`Käänbös puuttuu viranomainen.${suunnittelustaVastaavaViranomainen}:lle!`);
    }
    return kaannos.replace("keskus", "keskukselle").replace("virasto", "virastolle");
  }

  static tilaajaOrganisaatioForViranomainen(viranomainen: Viranomainen | null, kieli: Kieli): string {
    return translate("viranomainen." + viranomainen, kieli) || "<Tilaajaorganisaation tieto puuttuu>";
  }

  viranomaisen(): string {
    return this.tilaajaGenetiivi;
  }

  get tilaajaGenetiivi(): string {
    const tilaajaOrganisaatio = this.tilaajaOrganisaatio;
    const defaultValue = "tilaajaorganisaation";
    if (this.velho.suunnittelustaVastaavaViranomainen == Viranomainen.MUU) {
      return defaultValue;
    }
    if (this.velho.suunnittelustaVastaavaViranomainen == Viranomainen.VAYLAVIRASTO) {
      return translate("vaylaviraston", this.kieli) || defaultValue;
    }
    return tilaajaOrganisaatio.replace("keskus", "keskuksen");
  }

  get kuntia(): string {
    const kunnat = this.velho?.kunnat?.map((kuntaId) => kuntametadata.nameForKuntaId(kuntaId, this.kieli));
    if (kunnat) {
      return kunnat.join(", ");
    }
    return "";
  }

  protected get suunnitelma(): string {
    return translate("suunnitelma." + this.projektiTyyppi + ".perusmuoto", this.kieli) || "";
  }

  get suunnitelmaa(): string {
    return translate("suunnitelma." + this.projektiTyyppi + ".partitiivi", this.kieli) || "";
  }

  get suunnitelman(): string {
    return translate("suunnitelma." + this.projektiTyyppi + ".genetiivi", this.kieli) || "";
  }

  get suunnitelman_nimi(): string {
    return this.nimi;
  }

  get nimi(): string {
    if (this.isKieliSupported(this.kieli, this.kielitiedot)) {
      if (this.kieli == Kieli.SUOMI) {
        return this.velho.nimi;
      } else {
        // projektinNimiVieranskielella on oltava
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return this.kielitiedot.projektinNimiVieraskielella;
      }
    }
    throw new Error("Pyydettyä kieliversiota ei ole saatavilla");
  }

  kutsuja(): string | undefined {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return this.tilaajaOrganisaatio;
    } else {
      return translate("vaylavirasto", this.kieli);
    }
  }

  get aloituskuulutusYllapitoUrl(): string {
    assertIsDefined(this.oid);
    return linkAloituskuulutusYllapito(this.oid);
  }

  get aloituskuulutusUrl(): string {
    assertIsDefined(this.oid);
    return linkAloituskuulutus(this.oid);
  }

  get kutsuUrl(): string {
    assertIsDefined(this.oid);
    return linkSuunnitteluVaihe(this.oid);
  }

  get linkki_hyvaksymispaatos(): string {
    assertIsDefined(this.oid);
    return linkHyvaksymisPaatos(this.oid);
  }

  get tietosuojaurl(): string {
    return this.selectText(
      "https://www.vayla.fi/tietosuoja",
      "https://vayla.fi/sv/trafikledsverket/kontaktuppgifter/dataskyddspolicy",
      "https://www.vayla.fi/tietosuoja"
    );
  }

  get asiatunnus(): string {
    const asiatunnus = getAsiatunnus(this.velho);
    assertIsDefined(asiatunnus, "asiatunnus puuttuu");
    return asiatunnus;
  }

  selectText(suomi: string, ruotsi?: string, saame?: string): string {
    if (this.kieli == Kieli.SUOMI && suomi) {
      return suomi;
    } else if (this.kieli == Kieli.RUOTSI && ruotsi) {
      return ruotsi;
    } else if (this.kieli == Kieli.SAAME && saame) {
      return saame;
    }
    return "<" + this.kieli + suomi + this.kieli + ">";
  }

  yhteystiedot(
    yhteystiedot: Yhteystieto[] | null | undefined,
    yhteysHenkilot?: string[] | null,
    pakotaProjariTaiKunnanEdustaja?: boolean
  ): LokalisoituYhteystieto[] {
    let yt: Yhteystieto[] = [];
    let suunnitteluSopimus: SuunnitteluSopimusJulkaisu;
    if (yhteystiedot) {
      yt = yt.concat(yhteystiedot.map((yt) => yhteystietoPlusKunta(yt, suunnitteluSopimus)));
    }
    if (yhteysHenkilot) {
      if (!this.kayttoOikeudet) {
        throw new Error("BUG: Kayttöoikeudet pitää antaa jos yhteyshenkilöt on annettu.");
      }
      this.getUsersForUsernames(yhteysHenkilot || []).forEach((user) => {
        yt.push(vaylaUserToYhteystieto(user));
      });
    }
    if (pakotaProjariTaiKunnanEdustaja) {
      const projari = this.kayttoOikeudet?.find((ko) => ko.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO);

      if (!yt.find((t) => t.sahkoposti === projari?.email)) {
        yt = [vaylaUserToYhteystieto(projari as DBVaylaUser)].concat(yt);
      }
    }

    return yt.map((yt) => this.yhteystietoMapper(yt));
  }

  text(key: string): string {
    const translation = translate(key, this.kieli);
    if (!translation) {
      throw new Error(this.kieli + " translation missing for key " + key);
    }
    return this.substituteText(translation);
  }

  public substituteText(translation: string): string {
    return translation.replace(new RegExp(`{{(.+?)}}`, "g"), (_, part) => {
      const textFromResolver = this.findTextFromResolver(part);
      if (textFromResolver !== undefined) {
        return textFromResolver;
      }

      // Function from this class
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolvedText = (this as any)[part];
      if (typeof resolvedText == "function") {
        return resolvedText.bind(this)();
      }

      // Return text as it is if it was resolved
      if (resolvedText) {
        return resolvedText;
      }
      return "{{" + part + "}}";
    });
  }

  findTextFromResolver(part: string): string | unknown {
    let textFromResolver;
    for (const templateResolver of this.templateResolvers) {
      // Function from given templateResolver
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const func = (templateResolver as any)[part];
      if (typeof func == "function") {
        textFromResolver = func.bind(templateResolver)();
        break;
      }
      // Return text as it is if it was resolved
      if (func) {
        textFromResolver = func;
        break;
      }
    }
    return textFromResolver;
  }

  getUsersForUsernames(usernames: string[]): DBVaylaUser[] {
    const kayttoOikeudet = this.kayttoOikeudet;
    if (!kayttoOikeudet) {
      throw new Error("this.kayttooikeudet puuttuu");
    }
    return usernames
      .map((kayttajatunnus) =>
        kayttoOikeudet
          .filter((kayttaja) => kayttaja.kayttajatunnus == kayttajatunnus || kayttaja.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO)
          .pop()
      )
      .filter((o) => o) as DBVaylaUser[];
  }

  isKieliSupported(kieli: Kieli, kielitiedot: Kielitiedot): boolean {
    return kielitiedot.ensisijainenKieli == kieli || kielitiedot.toissijainenKieli == kieli;
  }

  yhteystietoMapper({ sukunimi, etunimi, organisaatio, kunta, puhelinnumero, sahkoposti, titteli }: Yhteystieto): LokalisoituYhteystieto {
    return {
      etunimi: formatProperNoun(etunimi),
      sukunimi: formatProperNoun(sukunimi),
      organisaatio: kunta ? kuntametadata.nameForKuntaId(kunta as number, this.kieli) || "" : formatProperNoun(organisaatio || ""),
      puhelinnumero,
      sahkoposti,
      titteli,
    };
  }

  yhteystiedotToTextArray(allYhteystiedot: (LokalisoituYhteystieto | Yhteystieto)[], showOrganization: boolean): string[] {
    return allYhteystiedot.map(({ organisaatio, etunimi, sukunimi, puhelinnumero, sahkoposti, titteli }) => {
      const noSpamSahkoposti = sahkoposti.replace(/@/g, "(at)");
      const organization = showOrganization ? `${organisaatio}, ` : "";
      const title = titteli ? `${titteli}, ` : "";
      return `${organization}${title}${formatNimi({ etunimi, sukunimi })}, ${this.localizedPuh} ${puhelinnumero}, ${noSpamSahkoposti} `;
    });
  }

  private get localizedPuh(): string {
    if (this.kieli == Kieli.SUOMI) {
      return "puh.";
    } else {
      return "tel.";
    }
  }

  get kuuluttaja(): string {
    return this.text("viranomainen." + this.velho?.suunnittelustaVastaavaViranomainen);
  }

  get kuuluttaja_pitka(): string {
    return this.text("viranomainen_pitka." + this.velho?.suunnittelustaVastaavaViranomainen);
  }

  get lakiviite_kunnan_ilmoitus(): string {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.text("asiakirja.ilmoitus.lakiviite_kunnan_ilmoitus_rata");
    }
    return this.text("asiakirja.ilmoitus.lakiviite_kunnan_ilmoitus_tie");
  }
}

export const formatList = (words: string[], kieli: Kieli): string => {
  if (words.length == 1) {
    return words[0];
  }
  const lastWord = words.slice(words.length - 1);
  const firstWords = words.slice(0, words.length - 1);
  return firstWords.join(", ") + andInLanguage[kieli] + lastWord;
};

const andInLanguage = { [Kieli.SUOMI]: " ja ", [Kieli.RUOTSI]: " och ", [Kieli.SAAME]: "" };
