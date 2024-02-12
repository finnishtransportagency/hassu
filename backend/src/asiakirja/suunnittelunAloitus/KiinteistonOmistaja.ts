import { NahtavillaoloVaiheJulkaisu } from "../../database/model/";
import { AsiakirjaTyyppi, Kieli } from "hassu-common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { AsiakirjanMuoto, Osoite } from "../asiakirjaTypes";
import { formatDate } from "../asiakirjaUtil";
import { createPDFFileName } from "../pdfFileName";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import PDFStructureElement = PDFKit.PDFStructureElement;
import { assertIsDefined } from "../../util/assertions";
import convert from "convert-units";
import { NahtavillaoloVaiheKutsuAdapter, NahtavillaoloVaiheKutsuAdapterProps } from "../adapter/nahtavillaoloVaiheKutsuAdapter";

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "KUULUTUS SUUNNITELMAN NÄHTÄVILLE ASETTAMISESTA",
  RUOTSI: "Kungörelse om framläggandet av planen",
};

export class KiinteistonOmistaja extends CommonPdf<NahtavillaoloVaiheKutsuAdapter> {
  private readonly nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu;
  protected header: string;
  protected kieli: KaannettavaKieli;
  protected vahainenMenettely: boolean | undefined | null;
  private osoite?: Osoite;

  constructor(params: NahtavillaoloVaiheKutsuAdapterProps, nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu) {
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
    if (!nahtavillaoloVaihe.kuulutusPaiva) {
      throw new Error("nahtavillaoloVaihe.kuulutusPaiva ei ole määritelty");
    }
    if (!nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva) {
      throw new Error("nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva ei ole määritelty");
    }
    const kutsuAdapter = new NahtavillaoloVaiheKutsuAdapter(
      {
        oid: params.oid,
        lyhytOsoite: params.lyhytOsoite,
        kuulutusPaiva: nahtavillaoloVaihe.kuulutusPaiva,
        kuulutusVaihePaattyyPaiva: nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva,
        hankkeenKuvaus: nahtavillaoloVaihe.hankkeenKuvaus,
        kielitiedot: params.kielitiedot,
        velho,
        kieli: params.kieli,
        kayttoOikeudet: params.kayttoOikeudet,
        kirjaamoOsoitteet: params.kirjaamoOsoitteet,
        euRahoitusLogot: params.euRahoitusLogot,
        asianhallintaPaalla: params.asianhallintaPaalla,
        linkkiAsianhallintaan: params.linkkiAsianhallintaan,
        yhteystiedot: params.yhteystiedot,
      },
      "lakiviite_ilmoitus_rata2"
    );
    const fileName = createPDFFileName(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
      kutsuAdapter.asiakirjanMuoto,
      velho.tyyppi,
      params.kieli
    );
    super(params.kieli, kutsuAdapter);
    const language = params.kieli;
    this.header = headers[language];
    this.kieli = params.kieli;
    this.vahainenMenettely = params.vahainenMenettely;

    this.nahtavillaoloVaihe = nahtavillaoloVaihe;
    this.osoite = params.osoite;

    this.kutsuAdapter.addTemplateResolver(this);
    this.setupPDF(this.header, kutsuAdapter.nimi, fileName);
  }

  private toPdfPoints(mm: number) {
    return convert(mm).from("mm").to("in") * 72;
  }

  iPostLogo(): string {
    const isVaylaTilaaja = this.isVaylaTilaaja();
    return this.fileBasePath + (isVaylaTilaaja ? "/files/vaylaipost.png" : "/files/elyipost.png");
  }

  protected appendHeader() {
    if (this.osoite) {
      let x = this.toPdfPoints(21);
      this.doc.text("VÄYLÄVIRASTO", x, this.toPdfPoints(20), { width: this.toPdfPoints(72), baseline: "top" });
      this.doc.text("PL 33", undefined, undefined, { width: this.toPdfPoints(72) });
      this.doc.text("00521 HELSINKI", undefined, undefined, { width: this.toPdfPoints(72) });

      this.doc.text(this.osoite?.nimi.toUpperCase(), x, this.toPdfPoints(55), { width: this.toPdfPoints(62), baseline: "top" });
      this.doc.text(this.osoite.katuosoite.toUpperCase(), undefined, undefined, { width: this.toPdfPoints(72) });
      this.doc.text(`${this.osoite.postinumero} ${this.osoite.postitoimipaikka}`.toUpperCase(), undefined, undefined, { width: this.toPdfPoints(72) });
      x = this.isVaylaTilaaja() ? this.toPdfPoints(75) : this.toPdfPoints(70);
      const y = this.isVaylaTilaaja() ? this.toPdfPoints(53) : this.toPdfPoints(57);
      this.doc.image(this.iPostLogo(), x, y, { fit: this.isVaylaTilaaja() ? [50, 43.48] : [63, 22.09] });
      this.doc.fontSize(12).fillColor("black").text(this.asiatunnus(), 350, 110);
      assertIsDefined(this.logo, "PDF:stä puuttuu logo");
      this.doc.image(this.logo, this.toPdfPoints(21), this.toPdfPoints(100), { height: 75 });

      this.doc.moveDown(16);
    } else {
      super.appendHeader(350);
    }
  }

  protected getIndention() {
    return this.toPdfPoints(25);
  }

  protected addContent(): void {
    const elements: PDFKit.PDFStructureElementChild[] = [this.addHeader(), ...this.addDocumentElements(), this.euLogoElement()].filter(
      (element) => element
    );
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected addDocumentElements(): PDFStructureElement[] {
    return [
      this.paragraph(this.kutsuAdapter.nimi),
      this.paragraphFromKey("kiinteistonomistaja_otsikko"),
      this.uudelleenKuulutusParagraph(),
      this.startOfPlanningPhrase,
      this.vahainenMenettely ? this.onKyseVahaisestaMenettelystaParagraph() : null,
      this.paragraph(this.kutsuAdapter.hankkeenKuvaus()),
      this.paragraphFromKey("kiinteistonomistaja_kappale6"),
      this.vahainenMenettely
        ? this.paragraphFromKey("kiinteistonomistaja_kappale7_vahainen_menettely")
        : this.paragraphFromKey("kiinteistonomistaja_kappale7"),
      this.paragraphFromKey("kiinteistonomistaja_kappale5"),
    ].filter((elem): elem is PDFStructureElement => !!elem);
  }

  private get startOfPlanningPhrase() {
    if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.paragraphFromKey("rata_kappale1");
    } else {
      return this.paragraphFromKey("tie_kappale1");
    }
  }

  protected get kuulutusPaiva(): string {
    return formatDate(this.nahtavillaoloVaihe?.kuulutusPaiva);
  }

  protected get kuulutusVaihePaattyyPaiva(): string {
    return formatDate(this.nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva);
  }

  private addHeader() {
    return this.headerElement(this.kutsuAdapter.text("otsikko2"));
  }

  protected uudelleenKuulutusParagraph(): PDFStructureElement | undefined {
    if (this.nahtavillaoloVaihe.uudelleenKuulutus?.selosteKuulutukselle) {
      return this.localizedParagraphFromMap(this.nahtavillaoloVaihe.uudelleenKuulutus?.selosteKuulutukselle);
    }
  }

  get linjaus(): string {
    if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return this.kutsuAdapter.text("linjaus_tie");
    } else if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.kutsuAdapter.text("linjaus_rata");
    }
    return "";
  }

  get alueeseen(): string {
    if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return this.kutsuAdapter.text("alueeseen_tie");
    } else if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.kutsuAdapter.text("alueeseen_rata");
    }
    return "";
  }

  get lakiviite_omistajille(): string {
    if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return this.kutsuAdapter.text("lakiviite_omistajille_tie");
    } else if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.kutsuAdapter.text("lakiviite_omistajille_rata");
    }
    return "";
  }
}
