import { NahtavillaoloVaiheJulkaisu, Velho } from "../../database/model/";
import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi } from "hassu-common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { formatDate, toPdfPoints } from "../asiakirjaUtil";
import { createPDFFileName } from "../pdfFileName";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import PDFStructureElement = PDFKit.PDFStructureElement;
import { NahtavillaoloVaiheKutsuAdapter, NahtavillaoloVaiheKutsuAdapterProps } from "../adapter/nahtavillaoloVaiheKutsuAdapter";

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "Kuulutus suunnitelman nähtäville asettamisesta",
  RUOTSI: "Kungörelse om framläggandet av planen",
};

export class KiinteistonOmistaja extends CommonPdf<NahtavillaoloVaiheKutsuAdapter> {
  private readonly nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu;
  protected header: string;
  protected kieli: KaannettavaKieli;
  protected vahainenMenettely: boolean | undefined | null;
  private readonly kuulutettuYhdessaSuunnitelmanimi: string | undefined;
  private readonly velho: Velho;

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
        kuulutettuYhdessaSuunnitelmanimi: params.kuulutettuYhdessaSuunnitelmanimi,
      },
      "lakiviite_ilmoitus_rata2"
    );
    const fileName = createPDFFileName(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
      kutsuAdapter.asiakirjanMuoto,
      velho.tyyppi,
      params.kieli
    );
    super(params.kieli, kutsuAdapter, params.osoite, 350, toPdfPoints(21));
    this.velho = velho;
    const language = params.kieli;
    this.header = headers[language];
    this.kieli = params.kieli;
    this.vahainenMenettely = params.vahainenMenettely;
    this.kuulutettuYhdessaSuunnitelmanimi = params.kuulutettuYhdessaSuunnitelmanimi;

    this.nahtavillaoloVaihe = nahtavillaoloVaihe;
    this.kutsuAdapter.addTemplateResolver(this);
    this.setupPDF(this.header, kutsuAdapter.nimi, fileName);
  }

  protected getIndention() {
    return toPdfPoints(25);
  }

  protected addContent(): void {
    const elements: PDFKit.PDFStructureElementChild[] = [this.addHeader(), ...this.addDocumentElements(), this.euLogoElement()].filter(
      (element) => element
    );
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected addDocumentElements(): PDFStructureElement[] {
    return [
      this.paragraphFromKey("kiinteistonomistaja_otsikko"),
      this.uudelleenKuulutusParagraph(),
      this.startOfPlanningPhrase,
      this.vahainenMenettely ? this.onKyseVahaisestaMenettelystaParagraph() : null,
      this.paragraph(this.kutsuAdapter.hankkeenKuvaus()),
      this.kuulutettuYhdessaSuunnitelmaParagraph(),
      this.paragraphFromKey("kiinteistonomistaja_kappale6"),
      this.vahainenMenettely
        ? this.paragraphFromKey("kiinteistonomistaja_kappale7_vahainen_menettely")
        : this.paragraphFromKey("kiinteistonomistaja_kappale7"),
      this.paragraphFromKey("kiinteistonomistaja_kappale5"),
      this.lahetettyOmistajilleParagraph(),
      this.paragraphFromKey("maanomistaja"),
      this.tietosuojaParagraph(),
      this.projektiPaallikko(),
      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.nahtavillaoloVaihe.yhteystiedot, null, true)),
      this.jakeluTiedoksiText(),
    ].filter((elem): elem is PDFStructureElement => !!elem);
  }

  private projektiPaallikko(): PDFKit.PDFStructureElementChild {
    return () => {
      this.doc.text(this.kutsuAdapter.projektipaallikkoNimi);
      this.doc.text(this.kutsuAdapter.text("projektipaallikko"));
      this.doc.text(this.kutsuAdapter.projektipaallikkoOrganisaatio!).moveDown();
    };
  }

  private kuulutettuYhdessaSuunnitelmaParagraph(): PDFStructureElement | undefined {
    if (this.kuulutettuYhdessaSuunnitelmanimi) {
      return this.paragraphFromKey("liittyvat-suunnitelmat.kuulutettu-yhdessa-pdf");
    }
  }

  private jakeluTiedoksiText(): PDFKit.PDFStructureElementChild {
    return () => {
      this.doc.text(this.kutsuAdapter.text("jakelu1")).moveUp();
      this.doc.text(this.kutsuAdapter.text("jakelu2"), { indent: 70 });
      this.doc.text(this.kutsuAdapter.text("jakelu3"), { indent: 70 });
      if (this.kieli === Kieli.RUOTSI) {
        this.doc.text(this.kutsuAdapter.text("jakelu4"), { indent: 70 });
      }
      this.doc.text(this.kutsuAdapter.text("tiedoksi1")).moveUp();
      this.doc.text(this.kutsuAdapter.text("tiedoksi2"), { indent: 70 });
    };
  }

  private lahetettyOmistajilleParagraph() {
    if (this.velho.tyyppi === ProjektiTyyppi.YLEINEN) {
      return this.paragraphFromKey("lahetetty_omistajille_yleis");
    } else {
      return this.paragraphFromKey("lahetetty_omistajille_tie_rata");
    }
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
