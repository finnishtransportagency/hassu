import { NahtavillaoloVaiheJulkaisu } from "../../database/model/";
import { AsiakirjaTyyppi } from "hassu-common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { createPDFFileName } from "../pdfFileName";
import { NahtavillaoloVaiheKutsuAdapter, NahtavillaoloVaiheKutsuAdapterProps } from "../adapter/nahtavillaoloVaiheKutsuAdapter";
import PDFStructureElement = PDFKit.PDFStructureElement;
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

export class Kuulutus30 extends CommonPdf<NahtavillaoloVaiheKutsuAdapter> {
  private readonly nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu;
  protected header: string;
  protected kieli: KaannettavaKieli;
  protected vahainenMenettely: boolean | undefined | null;
  protected kuulutettuYhdessaSuunnitelmanimi: string | undefined;

  constructor(params: NahtavillaoloVaiheKutsuAdapterProps, nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu) {
    const velho = params.velho;
    if (!velho) {
      throw new Error("projekti.velho ei ole määritelty");
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
    const kutsuAdapter = new NahtavillaoloVaiheKutsuAdapter({
      oid: params.oid,
      lyhytOsoite: params.lyhytOsoite,
      kielitiedot: params.kielitiedot,
      kuulutusPaiva: nahtavillaoloVaihe.kuulutusPaiva,
      kuulutusVaihePaattyyPaiva: nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva,
      velho,
      kieli: params.kieli,
      kayttoOikeudet: params.kayttoOikeudet,
      hankkeenKuvaus: params.hankkeenKuvaus,
      kirjaamoOsoitteet: params.kirjaamoOsoitteet,
      euRahoitusLogot: params.euRahoitusLogot,
      asianhallintaPaalla: params.asianhallintaPaalla,
      linkkiAsianhallintaan: params.linkkiAsianhallintaan,
      yhteystiedot: params.yhteystiedot,
      suunnitteluSopimus: params.suunnitteluSopimus,
      kuulutettuYhdessaSuunnitelmanimi: params.kuulutettuYhdessaSuunnitelmanimi,
    });
    const fileName = createPDFFileName(AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS, kutsuAdapter.asiakirjanMuoto, velho.tyyppi, params.kieli);
    super(params.kieli, params.oid, kutsuAdapter);
    this.kieli = params.kieli;
    this.vahainenMenettely = params.vahainenMenettely;
    this.nahtavillaoloVaihe = nahtavillaoloVaihe;
    this.header = kutsuAdapter.subject;
    this.kuulutettuYhdessaSuunnitelmanimi = params.kuulutettuYhdessaSuunnitelmanimi;

    this.kutsuAdapter.addTemplateResolver(this);
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName, kutsuAdapter.sopimus);
  }

  protected addContent(): void {
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.headerElement(this.header),
      this.titleElement(),
      this.uudelleenKuulutusParagraph(),
      ...this.addDocumentElements(),
      this.euLogoElement(),
      this.sopimusLogoElement(),
    ].filter((element) => element) as PDFKit.PDFStructureElementChild[];
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected addDocumentElements(): PDFStructureElement[] {
    return [
      this.startOfPlanningPhrase,
      this.paragraph(this.kutsuAdapter.hankkeenKuvaus()),
      this.kuulutettuYhdessaSuunnitelmaParagraph(),
      this.vahainenMenettely ? this.onKyseVahaisestaMenettelystaParagraph() : null,
      this.paragraphFromKey("kappale2"),
      this.paragraphFromKey("kappale3"),
      this.vahainenMenettely ? this.paragraphFromKey("kappale4_vahainen_menettely") : this.paragraphFromKey("kappale4"),
      this.tietosuojaParagraph(),
      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.nahtavillaoloVaihe?.yhteystiedot, null, true)),
    ].filter((elem): elem is PDFStructureElement => !!elem);
  }

  private kuulutettuYhdessaSuunnitelmaParagraph(): PDFStructureElement | undefined {
    return this.kuulutettuYhdessaSuunnitelmanimi ? this.paragraphFromKey("liittyvat-suunnitelmat.kuulutettu-yhdessa-pdf") : undefined;
  }

  private get startOfPlanningPhrase() {
    if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.paragraphFromKey("rata_kappale1");
    } else {
      return this.paragraphFromKey("tie_kappale1");
    }
  }

  protected uudelleenKuulutusParagraph(): PDFStructureElement | undefined {
    if (this.nahtavillaoloVaihe.uudelleenKuulutus?.selosteKuulutukselle) {
      return this.localizedParagraphFromMap(this.nahtavillaoloVaihe.uudelleenKuulutus?.selosteKuulutukselle);
    }
  }
}
