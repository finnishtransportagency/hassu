import log from "loglevel";
import { Kieli, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { AloitusKuulutusJulkaisu, Kielitiedot, Yhteystieto } from "../../database/model/projekti";
import { formatProperNoun } from "../../../../common/util/formatProperNoun";
import { AbstractPdf } from "../abstractPdf";

function isKieliSupported(kieli: Kieli, kielitiedot: Kielitiedot) {
  return kielitiedot.ensisijainenKieli == kieli || kielitiedot.toissijainenKieli == kieli;
}

function selectNimi(julkaisu: AloitusKuulutusJulkaisu, kieli: Kieli): string {
  if (isKieliSupported(kieli, julkaisu.kielitiedot)) {
    if (kieli == Kieli.SUOMI) {
      return julkaisu?.velho.nimi;
    } else {
      return julkaisu.kielitiedot.projektinNimiVieraskielella;
    }
  }
  throw new Error("Pyydettyä kieliversiota ei ole saatavilla");
}

export abstract class SuunnittelunAloitusPdf extends AbstractPdf {
  protected header: string;
  protected aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu;
  private kieli: Kieli;

  constructor(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu, kieli: Kieli, header: string) {
    super(header, selectNimi(aloitusKuulutusJulkaisu, kieli));
    this.header = header;
    this.kieli = kieli;
    this.aloitusKuulutusJulkaisu = aloitusKuulutusJulkaisu;
  }

  protected get isVaylaTilaaja() {
    return this.aloitusKuulutusJulkaisu.velho.tilaajaOrganisaatio === "Väylävirasto";
  }

  protected addContent() {
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.logo,
      this.headerElement,
      this.titleElement,
      ...this.addDocumentElements(),
    ];
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    throw new Error("Method 'addDocumentElements()' must be implemented.");
  }

  protected get projektiTyyppi() {
    let tyyppi = "";
    switch (this.aloitusKuulutusJulkaisu.velho.tyyppi) {
      case ProjektiTyyppi.TIE:
        tyyppi = "tiesuunnitelma";
        break;
      case ProjektiTyyppi.YLEINEN:
        tyyppi = "yleissuunnitelma";
        break;
      case ProjektiTyyppi.RATA:
        tyyppi = "ratasuunnitelma";
        break;
    }
    return tyyppi;
  }

  protected get yhteystiedot() {
    const yt: Yhteystieto[] = [];
    const suunnitteluSopimus = this.aloitusKuulutusJulkaisu.suunnitteluSopimus;
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
    return yt.concat(this.aloitusKuulutusJulkaisu.yhteystiedot).map(({ sukunimi, etunimi, organisaatio, ...rest }) => ({
      etunimi: formatProperNoun(etunimi),
      sukunimi: formatProperNoun(sukunimi),
      organisaatio: formatProperNoun(organisaatio),
      ...rest,
    }));
  }

  protected get moreInfoElements(): PDFKit.PDFStructureElementChild[] {
    return this.yhteystiedot.map(({ organisaatio, etunimi, sukunimi, puhelinnumero, sahkoposti }) => {
      const element: PDFKit.PDFStructureElementChild = () => {
        const noSpamSahkoposti = sahkoposti.replace(/@/g, "(at)");
        this.doc
          .text(`${organisaatio}, ${etunimi} ${sukunimi}, puh. ${puhelinnumero}, ${noSpamSahkoposti} `)
          .moveDown();
      };
      return element;
    });
  }

  protected get kuulutusPaiva() {
    return this.aloitusKuulutusJulkaisu?.kuulutusPaiva
      ? new Date(this.aloitusKuulutusJulkaisu?.kuulutusPaiva).toLocaleDateString("fi")
      : "DD.MM.YYYY";
  }

  private get logo() {
    const alt = this.isVaylaTilaaja ? "Väylävirasto — Trafikledsverket" : "Elinkeino-, liikenne- ja ympäristökeskus";
    const filePath = this.isVaylaTilaaja ? "/files/vayla.png" : "/files/ely.png";
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

  private get headerElement() {
    return this.doc.struct("H1", {}, () => {
      this.doc.moveDown(1).font("ArialMTBold").fontSize(10).text(this.header).moveDown(1);
    });
  }

  private get titleElement() {
    return this.doc.struct("H2", {}, () => {
      const parts = [selectNimi(this.aloitusKuulutusJulkaisu, this.kieli)];
      // parts.push(this.projektiTyyppi);
      this.doc.text(parts.join(", ")).font("ArialMT").moveDown();
    });
  }

  protected get tilaajaGenetiivi() {
    const tilaajaOrganisaatio = this.aloitusKuulutusJulkaisu.velho?.tilaajaOrganisaatio;
    return tilaajaOrganisaatio
      ? tilaajaOrganisaatio === "Väylävirasto"
        ? "Väyläviraston"
        : tilaajaOrganisaatio?.slice(0, -1) + "ksen"
      : "Tilaajaorganisaation";
  }

  protected hankkeenKuvaus() {
    return this.localizedParagraphFromMap(this.aloitusKuulutusJulkaisu?.hankkeenKuvaus);
  }

  protected lisatietojaAntavatParagraph() {
    return this.localizedParagraph(["Lisätietoja antavat ", "RUOTSIKSI Lisätietoja antavat "]);
  }

  protected localizedParagraph(suomiRuotsiSaameParagraphs: string[]) {
    return this.paragraph(this.selectText(suomiRuotsiSaameParagraphs));
  }

  protected localizedParagraphFromMap(localizations: { [key in Kieli]?: string }) {
    const text = localizations[this.kieli];
    if (text) {
      return this.paragraph(text);
    } else {
      return this.paragraph("");
    }
  }

  protected selectText(suomiRuotsiSaameParagraphs: string[]) {
    if (this.kieli == Kieli.SUOMI && suomiRuotsiSaameParagraphs.length > 0) {
      return suomiRuotsiSaameParagraphs[0];
    } else if (this.kieli == Kieli.RUOTSI && suomiRuotsiSaameParagraphs.length > 1) {
      return suomiRuotsiSaameParagraphs[1];
    } else if (this.kieli == Kieli.SAAME && suomiRuotsiSaameParagraphs.length > 2) {
      return suomiRuotsiSaameParagraphs[2];
    }
  }
}
