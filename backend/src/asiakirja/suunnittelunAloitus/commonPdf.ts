import { AbstractPdf } from "../abstractPdf";
import { Kieli, Viranomainen } from "../../../../common/graphql/apiModel";
import * as commonFI from "../../../../src/locales/fi/common.json";
import * as commonSV from "../../../../src/locales/sv/common.json";
import { AloitusKuulutusJulkaisu, Kielitiedot, Yhteystieto } from "../../database/model/projekti";
import log from "loglevel";
import { formatProperNoun } from "../../../../common/util/formatProperNoun";
import PDFStructureElement = PDFKit.PDFStructureElement;

export abstract class CommonPdf extends AbstractPdf {
  private tietosuojaUrl;
  protected kieli: Kieli;

  constructor(header: string, nimi: string, kieli: Kieli) {
    super(header, nimi);
    this.kieli = kieli;
  }

  protected selectText(suomiRuotsiSaameParagraphs: string[]): string {
    if (this.kieli == Kieli.SUOMI && suomiRuotsiSaameParagraphs.length > 0) {
      return suomiRuotsiSaameParagraphs[0];
    } else if (this.kieli == Kieli.RUOTSI && suomiRuotsiSaameParagraphs.length > 1) {
      return suomiRuotsiSaameParagraphs[1];
    } else if (this.kieli == Kieli.SAAME && suomiRuotsiSaameParagraphs.length > 2) {
      return suomiRuotsiSaameParagraphs[2];
    }
  }

  protected vaylavirastoTietosuojaParagraph(): PDFStructureElement {
    const tietosuojaUrl = this.selectText([
      "https://www.vayla.fi/tietosuoja",
      "https://vayla.fi/sv/trafikledsverket/kontaktuppgifter/dataskyddspolicy",
      "https://www.vayla.fi/tietosuoja",
    ]);
    return this.doc.struct("P", {}, [
      () => {
        this.doc.text(
          this.selectText([
            `Väylävirasto käsittelee suunnitelmaan laatimiseen liittyen tarpeellisia henkilötietoja. Halutessasi tietää tarkemmin väyläsuunnittelun tietosuojakäytänteistä, tutustu verkkosivujen tietosuojaosioon osoitteessa `,
            `Trafikledsverket behandlar personuppgifter som är nödvändiga för utarbetandet av planen. Om du vill veta mer om trafikledsplaneringens dataskyddspolicy, bekanta dig med sektionen om dataskydd på webbplatsen `,
          ]),
          { continued: true }
        );
      },
      this.doc.struct("Link", { alt: tietosuojaUrl }, () => {
        this.doc.fillColor("blue").text(tietosuojaUrl, {
          link: tietosuojaUrl,
          continued: true,
          underline: true,
        });
      }),
      () => {
        this.doc.fillColor("black").text(".", { link: undefined, underline: false }).moveDown();
      },
    ]);
  }

  protected viranomainenTietosuojaParagraph(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu): PDFStructureElement {
    const viranomainen = this.localizedTilaajaOrganisaatio(
      aloitusKuulutusJulkaisu.velho.suunnittelustaVastaavaViranomainen,
      aloitusKuulutusJulkaisu.velho.tilaajaOrganisaatio
    );
    const tietosuojaUrl = this.isVaylaTilaaja(aloitusKuulutusJulkaisu)
      ? "https://vayla.fi/tietosuoja"
      : "https://www.ely-keskus.fi/tietosuoja";
    return this.doc.struct("P", {}, [
      () => {
        this.doc.text(
          this.selectText([
            `${viranomainen} käsittelee suunnitelman laatimiseen liittyen tarpeellisia henkilötietoja. Halutessasi tietää tarkemmin väyläsuunnittelun tietosuojakäytänteistä, tutustu verkkosivujen tietosuojaosioon osoitteessa `,
            `${viranomainen} behandlar personuppgifter som är nödvändiga för utarbetandet av planen. Om du vill veta mer om trafikledsplaneringens dataskyddspolicy, bekanta dig med sektionen om dataskydd på webbplatsen `,
          ]),
          { continued: true }
        );
      },
      this.doc.struct("Link", { alt: this.tietosuojaUrl }, () => {
        this.doc.fillColor("blue").text(this.tietosuojaUrl, {
          link: tietosuojaUrl,
          continued: true,
          underline: true,
        });
      }),
      () => {
        this.doc.fillColor("black").text(".", { link: undefined, underline: false }).moveDown();
      },
    ]);
  }

  protected localizedTilaajaOrganisaatio(
    suunnittelustaVastaavaViranomainen: string,
    tilaajaOrganisaatio?: string | undefined
  ): string {
    return suunnittelustaVastaavaViranomainen
      ? this.getLocalization("viranomainen." + suunnittelustaVastaavaViranomainen)
      : tilaajaOrganisaatio;
  }

  protected getLocalization(key: string): string {
    let bundle;
    if (this.kieli == Kieli.SUOMI) {
      bundle = commonFI;
    } else if (this.kieli == Kieli.RUOTSI) {
      bundle = commonSV;
    } else {
      return;
    }
    return key.split(".").reduce((previousValue, currentValue) => {
      return previousValue[currentValue];
    }, bundle);
  }

  protected isVaylaTilaaja(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu): boolean {
    return aloitusKuulutusJulkaisu.velho.suunnittelustaVastaavaViranomainen
      ? aloitusKuulutusJulkaisu.velho.suunnittelustaVastaavaViranomainen == Viranomainen.VAYLAVIRASTO
      : aloitusKuulutusJulkaisu.velho.tilaajaOrganisaatio === "Väylävirasto";
  }

  protected lisatietojaAntavatParagraph(): PDFStructureElement {
    return this.localizedParagraph(["Lisätietoja antavat ", "Mer information om planen "]);
  }

  protected localizedParagraph(suomiRuotsiSaameParagraphs: string[]): PDFStructureElement {
    return this.paragraph(this.selectText(suomiRuotsiSaameParagraphs));
  }

  protected localizedParagraphFromMap(localizations: { [key in Kieli]?: string }): PDFStructureElement {
    const text = localizations[this.kieli];
    if (text) {
      return this.paragraph(text);
    } else {
      return this.paragraph("");
    }
  }

  protected headerElement(header: string): PDFStructureElement {
    return this.doc.struct("H1", {}, () => {
      this.doc.moveDown(1).font("ArialMTBold").fontSize(10).text(header).moveDown(1);
    });
  }

  protected titleElement(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu): PDFStructureElement {
    return this.doc.struct("H2", {}, () => {
      const parts = [selectNimi(aloitusKuulutusJulkaisu, this.kieli)];
      this.doc.text(parts.join(", ")).font("ArialMT").moveDown();
    });
  }

  protected logo(isVaylaTilaaja: boolean): PDFStructureElement {
    const alt = isVaylaTilaaja ? "Väylävirasto — Trafikledsverket" : "Elinkeino-, liikenne- ja ympäristökeskus";
    const filePath = isVaylaTilaaja ? "/files/vayla.png" : "/files/ely.png";
    return this.doc.struct(
      "Figure",
      {
        alt,
      },
      [
        () => {
          const fullFilePath = this.fileBasePath + filePath;
          log.info(fullFilePath);
          this.doc.image(fullFilePath, undefined, undefined, { height: 83 });
        },
      ]
    );
  }

  protected getYhteystiedot(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu) {
    const yt: Yhteystieto[] = [];
    const suunnitteluSopimus = aloitusKuulutusJulkaisu.suunnitteluSopimus;
    if (suunnitteluSopimus) {
      const { email, puhelinnumero, sukunimi, etunimi, kunta } = suunnitteluSopimus;
      yt.push({
        etunimi,
        sukunimi,
        puhelinnumero,
        sahkoposti: email,
        organisaatio: kunta,
      });
    }
    return yt.concat(aloitusKuulutusJulkaisu.yhteystiedot).map(({ sukunimi, etunimi, organisaatio, ...rest }) => ({
      etunimi: formatProperNoun(etunimi),
      sukunimi: formatProperNoun(sukunimi),
      organisaatio: formatProperNoun(organisaatio),
      ...rest,
    }));
  }

  protected moreInfoElements(
    aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu,
    showOrganization = true
  ): PDFKit.PDFStructureElementChild[] {
    return this.getYhteystiedot(aloitusKuulutusJulkaisu).map(
      ({ organisaatio, etunimi, sukunimi, puhelinnumero, sahkoposti }) => {
        return () => {
          const noSpamSahkoposti = sahkoposti.replace(/@/g, "(at)");
          const organization = showOrganization ? `${organisaatio}, ` : "";
          this.doc
            .text(`${organization}${etunimi} ${sukunimi}, ${this.localizedPuh} ${puhelinnumero}, ${noSpamSahkoposti} `)
            .moveDown();
        };
      }
    );
  }

  private get localizedPuh(): string {
    if (this.kieli == Kieli.SUOMI) {
      return "puh.";
    } else {
      return "tel.";
    }
  }
}

export function selectNimi(julkaisu: AloitusKuulutusJulkaisu, kieli: Kieli): string {
  if (isKieliSupported(kieli, julkaisu.kielitiedot)) {
    if (kieli == Kieli.SUOMI) {
      return julkaisu?.velho.nimi;
    } else {
      return julkaisu.kielitiedot.projektinNimiVieraskielella;
    }
  }
  throw new Error("Pyydettyä kieliversiota ei ole saatavilla");
}

function isKieliSupported(kieli: Kieli, kielitiedot: Kielitiedot) {
  return kielitiedot.ensisijainenKieli == kieli || kielitiedot.toissijainenKieli == kieli;
}
