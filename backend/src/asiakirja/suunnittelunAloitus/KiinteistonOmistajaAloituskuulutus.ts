// Contains code generated or recommended by Amazon Q
import { AloitusKuulutusJulkaisu } from "../../database/model/";
import { AsiakirjaTyyppi, Kieli } from "hassu-common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { formatDate, toPdfPoints } from "../asiakirjaUtil";
import { createPDFFileName } from "../pdfFileName";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import PDFStructureElement = PDFKit.PDFStructureElement;
import { AloituskuulutusKutsuAdapter, AloituskuulutusKutsuAdapterProps } from "../adapter/aloituskuulutusKutsuAdapter";

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "Ilmoitus henkilötietojen käsittelystä",
  RUOTSI: "Anmälan om behandling av personuppgifter",
};

export class KiinteistonOmistajaAloituskuulutus extends CommonPdf<AloituskuulutusKutsuAdapter> {
  private readonly aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu;
  protected header: string;
  protected kieli: KaannettavaKieli;
  protected vahainenMenettely: boolean | undefined | null;
  private readonly kuulutettuYhdessaSuunnitelmanimi: string | undefined;
  private readonly kirjePaivitetty: string | undefined;

  constructor(params: AloituskuulutusKutsuAdapterProps, aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu, kirjePaivitetty?: string) {
    const velho = params.velho;
    if (!velho) {
      throw new Error("params.velho ei ole määritelty");
    }
    if (!velho.tyyppi) {
      throw new Error("velho.tyyppi ei ole määritelty");
    }
    if (!velho.kunnat) {
      throw new Error("velho.kunnat ei ole määritelty");
    }
    if (!velho.suunnittelustaVastaavaViranomainen) {
      throw new Error("velho.suunnittelustaVastaavaViranomainen ei ole määritelty");
    }
    if (!params.kielitiedot) {
      throw new Error("params.kielitiedot ei ole määritelty");
    }
    if (!aloitusKuulutusJulkaisu.kuulutusPaiva) {
      throw new Error("aloitusKuulutusJulkaisu.kuulutusPaiva ei ole määritelty");
    }

    const kutsuAdapter = new AloituskuulutusKutsuAdapter(
      {
        oid: params.oid,
        lyhytOsoite: params.lyhytOsoite,
        kuulutusPaiva: aloitusKuulutusJulkaisu.kuulutusPaiva,
        kuulutusVaihePaattyyPaiva: params.kuulutusVaihePaattyyPaiva,
        hankkeenKuvaus: aloitusKuulutusJulkaisu.hankkeenKuvaus,
        kielitiedot: params.kielitiedot,
        velho,
        kieli: params.kieli,
        kayttoOikeudet: params.kayttoOikeudet,
        kirjaamoOsoitteet: params.kirjaamoOsoitteet,
        euRahoitusLogot: params.euRahoitusLogot,
        asianhallintaPaalla: params.asianhallintaPaalla,
        linkkiAsianhallintaan: params.linkkiAsianhallintaan,
        yhteystiedot: params.yhteystiedot,
        suunnitteluSopimus: params.suunnitteluSopimus,
        kuulutettuYhdessaSuunnitelmanimi: params.kuulutettuYhdessaSuunnitelmanimi,
        vahainenMenettely: params.vahainenMenettely,
        uudelleenKuulutus: params.uudelleenKuulutus,
      },
      "asiakirja.aloituskuulutus."
    );

    const fileName = createPDFFileName(
      AsiakirjaTyyppi.ILMOITUS_ALOITUSKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
      kutsuAdapter.asiakirjanMuoto,
      velho.tyyppi,
      params.kieli
    );

    super(params.kieli, params.oid, kutsuAdapter, params.osoite, 350, toPdfPoints(21));
    const language = params.kieli;
    this.header = headers[language];
    this.kieli = params.kieli;
    this.vahainenMenettely = params.vahainenMenettely;
    this.kuulutettuYhdessaSuunnitelmanimi = params.kuulutettuYhdessaSuunnitelmanimi;

    this.aloitusKuulutusJulkaisu = aloitusKuulutusJulkaisu;
    this.kirjePaivitetty = kirjePaivitetty;
    this.kutsuAdapter.addTemplateResolver(this);
    this.setupPDF(this.header, kutsuAdapter.nimi, fileName, kutsuAdapter.sopimus);
  }

  protected getIndention() {
    return toPdfPoints(25);
  }

  protected addContent(): void {
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.dateElement(),
      this.headerElement(this.header, false),
      ...this.addDocumentElements(),
      this.euLogoElement(),
      this.sopimusLogoElement(),
    ].filter((element) => element);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected addDocumentElements(): PDFStructureElement[] {
    return [
      this.paragraphFromKey("kiinteistonomistaja_otsikko"),
      this.uudelleenKuulutusParagraph(),
      this.paragraphFromKey("kiinteistonomistaja_kappale1"),
      this.kuulutettuYhdessaSuunnitelmaParagraph(),
      this.paragraphFromKey("kiinteistonomistaja_kappale2"),
      this.paragraphFromKey("kiinteistonomistaja_kappale3"),
      this.paragraphFromKey("kiinteistonomistaja_kappale4"),
      this.paragraphFromKey("kiinteistonomistaja_kappale5"),
      this.projektiPaallikko(),
      this.lisatietojaAntavatParagraph(),
      this.lisatietojaAntavatElements(),
      this.jakeluTiedoksiText(),
    ].filter((elem): elem is PDFStructureElement => !!elem);
  }

  private dateElement(): PDFStructureElement {
    return this.doc.struct("P", {}, () => {
      this.doc
        .fontSize(10)
        .text(this.kirjePaivitetty || this.kuulutusPaiva)
        .fontSize(12)
        .moveDown();
    });
  }

  private projektiPaallikko(): PDFKit.PDFStructureElementChild {
    return () => {
      this.doc.text(this.kutsuAdapter.projektipaallikkoNimi);
      this.doc.text(this.kutsuAdapter.text("projektipaallikko"));
      this.doc.text(this.kutsuAdapter.projektipaallikkoOrganisaatio!).moveDown();
    };
  }

  private jakeluTiedoksiText(): PDFKit.PDFStructureElementChild {
    const labelIndent = 70; // Same indent used in KiinteistonOmistaja (nähtävilläolo)
    const indentX = this.getIndention() + labelIndent;
    return () => {
      const jakeluY = this.doc.y;
      this.doc.text(this.kutsuAdapter.text("jakelu1"), this.getIndention(), jakeluY);
      this.doc.text(this.kutsuAdapter.text("jakelu2"), indentX, jakeluY);
      this.doc.text(this.kutsuAdapter.text("jakelu3"), indentX).moveDown();
      const tiedoksiY = this.doc.y;
      this.doc.text(this.kutsuAdapter.text("tiedoksi1"), this.getIndention(), tiedoksiY);
      this.doc.text(this.kutsuAdapter.text("tiedoksi2"), indentX, tiedoksiY);
    };
  }

  private lisatietojaAntavatElements(): PDFStructureElement {
    const yhteystiedot = this.kutsuAdapter.yhteystiedot(this.aloitusKuulutusJulkaisu.yhteystiedot, null, false);
    return this.doc.struct("P", {}, () => {
      yhteystiedot.forEach(({ organisaatio, titteli, etunimi, sukunimi, puhelinnumero, sahkoposti }, index) => {
        const noSpamSahkoposti = sahkoposti.replace(/@/g, "(at)");
        const titteliStr = titteli ? `, ${titteli}` : "";
        const separator = index < yhteystiedot.length - 1 ? " ja" : "";
        const text = `${organisaatio}${titteliStr}, ${etunimi} ${sukunimi}, ${this.kutsuAdapter.localizedPuh} ${puhelinnumero}, ${noSpamSahkoposti}${separator}`;
        this.doc.text(text);
      });
      this.doc.moveDown();
    });
  }

  private kuulutettuYhdessaSuunnitelmaParagraph(): PDFStructureElement | undefined {
    if (this.kuulutettuYhdessaSuunnitelmanimi) {
      return this.paragraphFromKey("liittyvat-suunnitelmat.kuulutettu-yhdessa-pdf");
    }
  }

  protected get kuulutusPaiva(): string {
    return formatDate(this.aloitusKuulutusJulkaisu?.kuulutusPaiva);
  }

  protected uudelleenKuulutusParagraph(): PDFStructureElement | undefined {
    if (this.aloitusKuulutusJulkaisu.uudelleenKuulutus?.selosteKuulutukselle) {
      return this.localizedParagraphFromMap(this.aloitusKuulutusJulkaisu.uudelleenKuulutus?.selosteKuulutukselle);
    }
  }
}
