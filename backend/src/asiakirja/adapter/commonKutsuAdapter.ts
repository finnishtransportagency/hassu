import { DBProjekti, DBVaylaUser, Kielitiedot, LocalizedMap, Velho, Yhteystieto } from "../../database/model";
import { KayttajaTyyppi, Kieli, ProjektiTyyppi, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { AsiakirjanMuoto, determineAsiakirjaMuoto } from "../asiakirjaTypes";
import { translate } from "../../util/localization";
import { kuntametadata } from "hassu-common/kuntametadata";
import { assertIsDefined } from "../../util/assertions";
import {
  LinkableProjekti,
  linkAloituskuulutus,
  linkAloituskuulutusYllapito,
  linkHyvaksymisPaatos,
  linkHyvaksymisPaatosYllapito,
  linkJatkoPaatos1,
  linkJatkoPaatos1Yllapito,
  linkJatkoPaatos2,
  linkJatkoPaatos2Yllapito,
  linkNahtavillaOlo,
  linkNahtavillaOloYllapito,
  linkSuunnitteluVaihe,
} from "hassu-common/links";
import { vaylaUserToYhteystieto } from "../../util/vaylaUserToYhteystieto";
import { formatProperNoun } from "hassu-common/util/formatProperNoun";
import { getAsiatunnus } from "../../projekti/projektiUtil";
import { formatDate, linkExtractRegEx } from "../asiakirjaUtil";
import { organisaatioIsEly } from "../../util/organisaatioIsEly";
import { formatNimi } from "../../util/userUtil";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { getLinkkiAsianhallintaan } from "../../asianhallinta/getLinkkiAsianhallintaan";
import { isProjektiAsianhallintaIntegrationEnabled } from "../../util/isProjektiAsianhallintaIntegrationEnabled";

export interface CommonKutsuAdapterProps {
  oid: string;
  lyhytOsoite: string | undefined | null;
  velho: Velho;
  kielitiedot?: Kielitiedot | null;
  kieli: KaannettavaKieli;
  kayttoOikeudet?: DBVaylaUser[];
  hankkeenKuvaus?: LocalizedMap<string>;
  euRahoitusLogot?: LocalizedMap<string> | null;
  vahainenMenettely?: boolean | null;
  asianhallintaPaalla: boolean;
  linkkiAsianhallintaan: string | undefined;
}

/**
 * Poimii annetusta objektista vain CommonKutsuAdapterProps:ssa esitellyt kentät
 */
export async function pickCommonAdapterProps(
  projekti: DBProjekti,
  hankkeenKuvaus: LocalizedMap<string>,
  kieli: KaannettavaKieli
): Promise<CommonKutsuAdapterProps> {
  const { oid, kielitiedot, velho, kayttoOikeudet, lyhytOsoite } = projekti;

  assertIsDefined(velho);
  return {
    oid,
    kielitiedot,
    velho,
    kayttoOikeudet,
    kieli,
    hankkeenKuvaus,
    lyhytOsoite,
    asianhallintaPaalla: await isProjektiAsianhallintaIntegrationEnabled(projekti),
    linkkiAsianhallintaan: await getLinkkiAsianhallintaan(projekti),
  };
}

export type LokalisoituYhteystieto = Omit<Yhteystieto, "organisaatio" | "kunta"> & { organisaatio: string };

export class CommonKutsuAdapter {
  readonly velho: Velho;
  readonly kieli: KaannettavaKieli;
  readonly asiakirjanMuoto: AsiakirjanMuoto;
  readonly oid: string;
  readonly projektiTyyppi: ProjektiTyyppi;
  readonly kayttoOikeudet?: DBVaylaUser[];
  readonly kielitiedot: Kielitiedot;
  readonly asianhallintaPaalla: boolean;
  readonly linkkiAsianhallintaan: string | undefined;
  private templateResolvers: unknown[] = [];
  readonly hankkeenKuvausParam?: LocalizedMap<string>;
  private localizationKeyPrefix?: string;

  euRahoitusLogot?: LocalizedMap<string> | null;
  linkableProjekti: LinkableProjekti;

  constructor(params: CommonKutsuAdapterProps, localizationKeyPrefix?: string) {
    const {
      oid,
      lyhytOsoite,
      velho,
      kielitiedot,
      kieli,
      kayttoOikeudet,
      hankkeenKuvaus,
      euRahoitusLogot,
      asianhallintaPaalla,
      linkkiAsianhallintaan,
    } = params;
    this.oid = oid;
    this.linkableProjekti = { oid, lyhytOsoite };
    this.velho = velho;
    assertIsDefined(kielitiedot, "kielitiedot määrittelemättä");

    this.kielitiedot = kielitiedot;
    this.kieli = kieli;
    assertIsDefined(velho.tyyppi, "velho.tyyppi ei ole määritelty");

    this.projektiTyyppi = velho.tyyppi;
    this.kayttoOikeudet = kayttoOikeudet;
    this.asiakirjanMuoto = determineAsiakirjaMuoto(velho?.tyyppi, velho?.vaylamuoto);
    this.hankkeenKuvausParam = hankkeenKuvaus;
    this.localizationKeyPrefix = localizationKeyPrefix;
    this.euRahoitusLogot = euRahoitusLogot;
    this.asianhallintaPaalla = asianhallintaPaalla;
    this.linkkiAsianhallintaan = linkkiAsianhallintaan ? " " + linkkiAsianhallintaan : "";
  }

  addTemplateResolver(value: unknown): void {
    this.templateResolvers.push(value);
  }

  get title(): string {
    return this.nimi;
  }

  hankkeenKuvaus(): string {
    assertIsDefined(this.hankkeenKuvausParam);
    return this.hankkeenKuvausParam[this.kieli] ?? "";
  }

  onKyseVahaisestaMenettelystaParagraph(): string {
    return this.substituteText(this.text("asiakirja.on_kyse_vahaisesta_menettelysta"));
  }

  get tilaajaOrganisaatio(): string {
    const suunnittelustaVastaavaViranomainen = this.velho.suunnittelustaVastaavaViranomainen;
    return (
      translate("viranomainen_keskipitka." + suunnittelustaVastaavaViranomainen, this.kieli) ??
      "<Suunnittelusta vastaavan viranomaisen tieto puuttuu>"
    );
  }

  get tilaajaOrganisaatioLyhyt(): string {
    const suunnittelustaVastaavaViranomainen = this.velho.suunnittelustaVastaavaViranomainen;
    return (
      translate("viranomainen." + suunnittelustaVastaavaViranomainen, this.kieli) ?? "<Suunnittelusta vastaavan viranomaisen tieto puuttuu>"
    );
  }

  isVaylaTilaaja(): boolean {
    return this.velho.suunnittelustaVastaavaViranomainen == SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO;
  }

  get viranomainen(): string {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      const kaannos: string = translate("viranomainen.VAYLAVIRASTO", this.kieli) ?? "";
      if (!kaannos) {
        throw new Error("Käännös puuttuu VAYLAVIRASTO:lle!");
      }
      return kaannos;
    }
    return this.tilaajaOrganisaatio;
  }

  get viranomainenLyhyt(): string {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      const kaannos: string = translate("viranomainen.VAYLAVIRASTO", this.kieli) ?? "";
      if (!kaannos) {
        throw new Error("Käännös puuttuu VAYLAVIRASTO:lle!");
      }
      return kaannos;
    }
    return this.tilaajaOrganisaatioLyhyt;
  }

  get tilaajaOrganisaatiota(): string {
    const suunnittelustaVastaavaViranomainen = this.velho.suunnittelustaVastaavaViranomainen;
    const kaannos: string = translate("viranomainen." + suunnittelustaVastaavaViranomainen, this.kieli) ?? "";
    if (!kaannos) {
      throw new Error(`Käänbös puuttuu viranomainen.${suunnittelustaVastaavaViranomainen}:lle!`);
    }
    return kaannos.replace("keskus", "keskusta").replace("virasto", "virastoa");
  }

  get tilaajaOrganisaatiolle(): string {
    const suunnittelustaVastaavaViranomainen = this.velho.suunnittelustaVastaavaViranomainen;
    const kaannos: string = translate("viranomainen." + suunnittelustaVastaavaViranomainen, this.kieli) ?? "";
    if (!kaannos) {
      throw new Error(`Käännös puuttuu viranomainen.${suunnittelustaVastaavaViranomainen}:lle!`);
    }
    return kaannos.replace("keskus", "keskukselle").replace("virasto", "virastolle");
  }

  get projektipaallikkoNimi(): string {
    const projektiPaallikko = this.kayttoOikeudet?.find((oikeus) => oikeus.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO);
    if (!projektiPaallikko) {
      throw new Error(`Projektipäällikkö puuttuu`);
    }
    return formatNimi(projektiPaallikko);
  }

  get projektipaallikkoOrganisaatio(): string | undefined {
    const projektiPaallikko = this.kayttoOikeudet?.find((oikeus) => oikeus.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO);
    if (!projektiPaallikko?.organisaatio) {
      throw new Error(`Projektipäällikkö tai sen organisaatiotieto puuttuu`);
    }

    const isElyOrganisaatio = !!organisaatioIsEly(projektiPaallikko.organisaatio) && !!projektiPaallikko.elyOrganisaatio;

    return isElyOrganisaatio
      ? translate(`viranomainen.${projektiPaallikko.elyOrganisaatio}`, this.kieli)
      : translate("viranomainen.VAYLAVIRASTO", this.kieli);
  }

  static tilaajaOrganisaatioForViranomainen(viranomainen: SuunnittelustaVastaavaViranomainen | null, kieli: KaannettavaKieli): string {
    return translate("viranomainen." + viranomainen, kieli) ?? "<Tilaajaorganisaation tieto puuttuu>";
  }

  viranomaisen(): string {
    return this.tilaajaGenetiivi;
  }

  tien(): string {
    return (
      (this.asiakirjanMuoto == AsiakirjanMuoto.RATA
        ? translate("suunnitelma.tien_rata", this.kieli)
        : translate("suunnitelma.tien_tie", this.kieli)) ?? ""
    );
  }

  get tilaajaGenetiivi(): string {
    const tilaajaOrganisaatio = this.tilaajaOrganisaatioLyhyt;
    const defaultValue = this.kieli == Kieli.SUOMI ? "tilaajaorganisaation" : "abonnentorganisation";
    if (this.velho.suunnittelustaVastaavaViranomainen == SuunnittelustaVastaavaViranomainen.MUU) {
      return defaultValue;
    }
    if (this.velho.suunnittelustaVastaavaViranomainen == SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO) {
      return (this.kieli == Kieli.RUOTSI ? translate("vaylavirasto", this.kieli) : translate("vaylaviraston", this.kieli)) ?? defaultValue;
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
    return translate("suunnitelma." + this.projektiTyyppi + ".perusmuoto", this.kieli) ?? "";
  }

  get suunnitelmaa(): string {
    return translate("suunnitelma." + this.projektiTyyppi + ".partitiivi", this.kieli) ?? "";
  }

  get suunnitelman(): string {
    return translate("suunnitelma." + this.projektiTyyppi + ".genetiivi", this.kieli) ?? "";
  }

  get suunnitelman_isolla(): string {
    return translate("suunnitelma." + this.projektiTyyppi + ".genetiivi_isolla", this.kieli) ?? "";
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
    return linkAloituskuulutus(this.linkableProjekti, this.kieli);
  }

  get kutsuUrl(): string {
    assertIsDefined(this.oid);
    return linkSuunnitteluVaihe(this.linkableProjekti, this.kieli);
  }

  get nahtavillaoloUrl(): string {
    assertIsDefined(this.oid);
    return linkNahtavillaOlo(this.linkableProjekti, this.kieli);
  }

  get nahtavillaoloYllapitoUrl(): string {
    assertIsDefined(this.oid);
    return linkNahtavillaOloYllapito(this.oid);
  }

  get hyvaksymispaatosYllapitoUrl(): string {
    assertIsDefined(this.oid);
    return linkHyvaksymisPaatosYllapito(this.oid);
  }

  get jatkopaatos1YllapitoUrl(): string {
    assertIsDefined(this.oid);
    return linkJatkoPaatos1Yllapito(this.oid);
  }

  get jatkopaatos2YllapitoUrl(): string {
    assertIsDefined(this.oid);
    return linkJatkoPaatos2Yllapito(this.oid);
  }

  get linkki_hyvaksymispaatos(): string {
    assertIsDefined(this.oid);
    return linkHyvaksymisPaatos(this.linkableProjekti, this.kieli);
  }

  get linkki_jatkopaatos1(): string {
    assertIsDefined(this.oid);
    return linkJatkoPaatos1(this.linkableProjekti, this.kieli);
  }

  get linkki_jatkopaatos2(): string {
    assertIsDefined(this.oid);
    return linkJatkoPaatos2(this.linkableProjekti, this.kieli);
  }

  get tietosuojaurl(): string {
    if (this.isVaylaTilaaja()) {
      return this.selectText("https://www.vayla.fi/tietosuoja", "https://vayla.fi/sv/trafikledsverket/kontaktuppgifter/dataskyddspolicy");
    } else {
      return this.selectText(
        "https://www.ely-keskus.fi/tietosuoja-ja-henkilotietojen-kasittely",
        "https://www.ely-keskus.fi/sv/tietosuoja-ja-henkilotietojen-kasittely"
      );
    }
  }

  get asiatunnus(): string {
    const asiatunnus = getAsiatunnus(this.velho);
    assertIsDefined(asiatunnus, "asiatunnus puuttuu");
    return asiatunnus;
  }

  selectText(suomi: string, ruotsi?: string): string {
    if (this.kieli == Kieli.SUOMI && suomi) {
      return suomi;
    } else if (this.kieli == Kieli.RUOTSI && ruotsi) {
      return ruotsi;
    }
    return "<" + this.kieli + suomi + this.kieli + ">";
  }

  yhteystiedot(
    yhteystiedot: Yhteystieto[] | null | undefined,
    yhteysHenkilot?: string[] | null,
    pakotaProjariTaiKunnanEdustaja?: boolean
  ): LokalisoituYhteystieto[] {
    let yt: Yhteystieto[] = yhteystiedot ?? [];
    if (yhteysHenkilot) {
      if (!this.kayttoOikeudet) {
        throw new Error("BUG: Kayttöoikeudet pitää antaa jos yhteyshenkilöt on annettu.");
      }
      this.getUsersForUsernames(yhteysHenkilot).forEach((user) => {
        yt.push(vaylaUserToYhteystieto(user));
      });
    }
    if (pakotaProjariTaiKunnanEdustaja) {
      const projari = this.kayttoOikeudet?.find((ko) => ko.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO);

      if (!yt.find((t) => t.sahkoposti === projari?.email)) {
        yt = [vaylaUserToYhteystieto(projari as DBVaylaUser)].concat(yt);
      }
    }

    return yt.map((y) => this.yhteystietoMapper(y));
  }

  text(key: string): string {
    let translation: string | undefined;
    if (this.localizationKeyPrefix) {
      translation = translate(this.localizationKeyPrefix + key, this.kieli);
    }
    if (!translation) {
      translation = translate(key, this.kieli);
    }
    if (!translation) {
      throw new Error(this.kieli + " translation missing for key " + key + " or " + this.localizationKeyPrefix + key);
    }
    return this.substituteText(translation);
  }

  htmlText(key: string, options?: { extLinks?: boolean }): string {
    const text = this.text(key);
    const parts = text.split(linkExtractRegEx);
    if (parts.length == 1) {
      return text;
    }

    const result: string[] = [];
    let linkOpen = false;
    for (const part of parts) {
      if (part.length == 0) {
        continue;
      }
      if (part.startsWith("http")) {
        if (options?.extLinks) {
          result.push(`<a external="true" href="${part}">${part}`);
        } else {
          result.push(`<a href="${part}">${part}`);
        }
        linkOpen = true;
      } else {
        if (linkOpen) {
          linkOpen = false;
          result.push("</a>");
        }
        result.push(part);
      }
    }

    if (linkOpen) {
      result.push("</a>");
    }
    return result.join("");
  }

  public substituteText(translation: string): string {
    // prettier-ignore
    return translation.replace(/{{(.+?)}}/g, (_, part) => { // NOSONAR
      const textFromResolver = this.findTextFromResolver(part);
      if (textFromResolver !== undefined) {
        return textFromResolver;
      }

      // Function from this class
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolvedText: any = (this as any)[part];
      if (typeof resolvedText == "function") {
        return resolvedText.bind(this)();
      }

      // Return text as it is if it was resolved
      if (resolvedText !== undefined && resolvedText !== null) {
        return resolvedText;
      }
      return "{{" + part + "}}";
    });
  }

  findTextFromResolver(part: string): unknown {
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

  yhteystietoMapper({
    sukunimi,
    etunimi,
    organisaatio,
    kunta,
    puhelinnumero,
    sahkoposti,
    titteli,
    elyOrganisaatio,
  }: Yhteystieto): LokalisoituYhteystieto {
    let organisaatioTeksti = organisaatio ?? "";
    if (kunta) {
      organisaatioTeksti = kuntametadata.nameForKuntaId(kunta, this.kieli);
    } else if (organisaatioIsEly(organisaatio) && elyOrganisaatio) {
      const kaannos = translate(`viranomainen.${elyOrganisaatio}`, this.kieli);
      if (kaannos) {
        organisaatioTeksti = kaannos;
      }
    } else {
      const orgKey = organisaatioTeksti.toUpperCase().replace(/Ä/g, "A").replace(/Ö/g, "O").replace(/ /g, "_");
      const kaannos = translate(`viranomainen.${orgKey}`, this.kieli);
      if (kaannos) {
        organisaatioTeksti = kaannos;
      }
    }

    return {
      etunimi: formatProperNoun(etunimi),
      sukunimi: formatProperNoun(sukunimi),
      organisaatio: organisaatioTeksti,
      puhelinnumero,
      sahkoposti,
      titteli,
    };
  }

  get localizedPuh(): string {
    return this.text("puh");
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

  formatDateRange(startDate: string, endDate?: string): string {
    if (endDate) {
      return formatDate(startDate) + " - " + formatDate(endDate);
    }
    return formatDate(startDate);
  }

  tieRataOptionTextFor(key: string): string {
    if (this.projektiTyyppi == ProjektiTyyppi.RATA) {
      return this.text(key + "_rata");
    }
    return this.text(key + "_tie");
  }
}

export const formatList = (words: string[], kieli: KaannettavaKieli): string => {
  if (words.length == 1) {
    return words[0];
  }
  const lastWord = words.slice(words.length - 1);
  const firstWords = words.slice(0, words.length - 1);
  return firstWords.join(", ") + andInLanguage[kieli] + lastWord;
};

const andInLanguage = { [Kieli.SUOMI]: " ja ", [Kieli.RUOTSI]: " och " };
