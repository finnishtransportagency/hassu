import { AbstractPdf, ParagraphOptions } from "../abstractPdf";
import { Kieli, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { LocalizedMap, Yhteystieto } from "../../database/model";
import { CommonKutsuAdapter } from "../adapter/commonKutsuAdapter";
import { formatNimi } from "../../util/userUtil";
import { fileService } from "../../files/fileService";
import { AsiakirjanMuoto, EnhancedPDF, Osoite } from "../asiakirjaTypes";
import PDFStructureElement = PDFKit.PDFStructureElement;
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { toPdfPoints } from "../asiakirjaUtil";

export abstract class CommonPdf<T extends CommonKutsuAdapter> extends AbstractPdf {
  protected kieli: KaannettavaKieli;
  kutsuAdapter: T;
  protected euLogo?: string | Buffer;
  private osoite?: Osoite;
  private asiaTunnusX?: number;
  private logoX?: number;

  protected constructor(kieli: KaannettavaKieli, kutsuAdapter: T, osoite?: Osoite, asiaTunnusX?: number, logoX?: number) {
    super();
    this.kieli = kieli;
    this.kutsuAdapter = kutsuAdapter;
    this.osoite = osoite;
    this.logoX = logoX;
    this.asiaTunnusX = asiaTunnusX;
  }

  public async pdf(luonnos: boolean): Promise<EnhancedPDF> {
    if (this.kutsuAdapter.euRahoitusLogot) {
      this.euLogo = await this.loadEuLogo(this.kutsuAdapter.euRahoitusLogot);
    }
    return super.pdf(luonnos);
  }

  protected selectText(suomiRuotsiParagraphs: string[]): string {
    if (this.kieli == Kieli.SUOMI && suomiRuotsiParagraphs.length > 0) {
      return suomiRuotsiParagraphs[0];
    } else if (this.kieli == Kieli.RUOTSI && suomiRuotsiParagraphs.length > 1) {
      return suomiRuotsiParagraphs[1];
    }
    return suomiRuotsiParagraphs[0];
  }

  protected tietosuojaParagraph(): PDFStructureElement {
    return this.paragraphFromKey("asiakirja.tietosuoja");
  }

  protected onKyseVahaisestaMenettelystaParagraph(prefix = ""): PDFStructureElement {
    return this.paragraph(prefix + this.kutsuAdapter.substituteText(this.kutsuAdapter.text("asiakirja.on_kyse_vahaisesta_menettelysta")));
  }

  isVaylaTilaaja(): boolean {
    return this.kutsuAdapter.isVaylaTilaaja();
  }

  protected lisatietojaAntavatParagraph(): PDFStructureElement {
    return this.paragraphBold(this.kutsuAdapter.text("asiakirja.lisatietoja_antavat"), { spacingAfter: 1 });
  }

  protected localizedParagraph(suomiRuotsiParagraphs: string[]): PDFStructureElement {
    return this.paragraph(this.selectText(suomiRuotsiParagraphs));
  }

  protected paragraphFromKey(key: string, options?: ParagraphOptions): PDFStructureElement {
    return this.paragraph(this.kutsuAdapter.text(key), { ...options, markupAllowed: true });
  }

  protected localizedParagraphFromMap(localizations: { [key in Kieli]?: string }): PDFStructureElement {
    const text = localizations[this.kieli];
    if (text) {
      return this.paragraph(text);
    } else {
      return this.paragraph("");
    }
  }

  getLahettaja() : Osoite {
    const viranomainen = this.kutsuAdapter.velho.suunnittelustaVastaavaViranomainen;
    if (viranomainen === SuunnittelustaVastaavaViranomainen.ETELA_POHJANMAAN_ELY) {
      return {
        nimi: "Etelä-Pohjanmaan ELY-keskus",
        katuosoite: "PL 156",
        postinumero: "60101",
        postitoimipaikka: "SEINÄJOKI",
      }
    } else if (viranomainen === SuunnittelustaVastaavaViranomainen.KAAKKOIS_SUOMEN_ELY) {
      return {
        nimi: "Kaakkois-Suomen ELY-keskus",
        katuosoite: "PL 1041",
        postinumero: "45101",
        postitoimipaikka: "Kouvola",
      }
    } else if (viranomainen === SuunnittelustaVastaavaViranomainen.KESKI_SUOMEN_ELY) {
      return {
        nimi: "Keski-Suomen ELY-keskus",
        katuosoite: "PL 250",
        postinumero: "40101",
        postitoimipaikka: "Jyväskylä",
      }
    } else if (viranomainen === SuunnittelustaVastaavaViranomainen.LAPIN_ELY) {
      return {
        nimi: "Lapin ELY-keskus",
        katuosoite: "PL 8060",
        postinumero: "96101",
        postitoimipaikka: "Rovaniemi",
      }
    } else if (viranomainen === SuunnittelustaVastaavaViranomainen.PIRKANMAAN_ELY) {
      return {
        nimi: "Pirkanmaan ELY-keskus",
        katuosoite: "PL 297",
        postinumero: "33101",
        postitoimipaikka: "Tampere",
      }
    } else if (viranomainen === SuunnittelustaVastaavaViranomainen.POHJOIS_POHJANMAAN_ELY) {
      return {
        nimi: "Pohjois-Pohjanmaan ELY-keskus",
        katuosoite: "PL 86",
        postinumero: "90101",
        postitoimipaikka: "Oulu",
      }
    } else if (viranomainen === SuunnittelustaVastaavaViranomainen.POHJOIS_SAVON_ELY) {
      return {
        nimi: "Pohjois-Savon ELY-keskus",
        katuosoite: "PL 2000",
        postinumero: "70101",
        postitoimipaikka: "Kuopio",
      }
    } else if (viranomainen === SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY) {
      return {
        nimi: "Uudenmaan ELY-keskus",
        katuosoite: "PL 36",
        postinumero: "00521",
        postitoimipaikka: "HELSINKI",
      }
    } else if (viranomainen === SuunnittelustaVastaavaViranomainen.VARSINAIS_SUOMEN_ELY) {
      return {
        nimi: "Varsinais-Suomen ELY-keskus",
        katuosoite: "PL 236",
        postinumero: "20101",
        postitoimipaikka: "TURKU",
      }
    } else {
      return {
        nimi: "Väylävirasto",
        katuosoite: "PL 33",
        postinumero: "00521",
        postitoimipaikka: "HELSINKI",
      };
    }
  }

  protected appendHeader() {
    if (this.osoite) {
      const x = toPdfPoints(21);
      const lahettaja = this.getLahettaja();
      this.doc.text(lahettaja.nimi, x, toPdfPoints(20), { width: toPdfPoints(72), baseline: "top" });
      this.doc.text(lahettaja.katuosoite, undefined, undefined, { width: toPdfPoints(72) });
      this.doc.text(`${lahettaja.postinumero} ${lahettaja.postitoimipaikka}`, undefined, undefined, { width: toPdfPoints(72) });

      const iPostX = this.isVaylaTilaaja() ? toPdfPoints(75) : toPdfPoints(70);
      const iPostY = this.isVaylaTilaaja() ? toPdfPoints(18) : toPdfPoints(24);
      this.doc.image(this.iPostLogo(), iPostX, iPostY, { fit: this.isVaylaTilaaja() ? [50, 43.48] : [63, 22.09], valign: "bottom" });

      this.doc.text(this.osoite?.nimi, x, toPdfPoints(55), { width: toPdfPoints(62), baseline: "top" });
      this.doc.text(this.osoite.katuosoite, undefined, undefined, { width: toPdfPoints(72) });
      this.doc.text(`${this.osoite.postinumero} ${this.osoite.postitoimipaikka.toUpperCase()}`, undefined, undefined, { width: toPdfPoints(72) });
      this.doc.fontSize(12).fillColor("black").text(this.asiatunnus(), this.asiaTunnusX, 110);

      this.doc.moveDown(12);
      this.osoite = undefined;
    } else {
      super.appendHeader(this.asiaTunnusX, this.logoX);
    }
  }

  protected headerElement(header: string, spacingBefore = true): PDFStructureElement {
    return this.doc.struct("H1", {}, () => {
      if (spacingBefore) {
        this.doc.moveDown(1);
      }
      this.doc.font("ArialMTBold").fontSize(10).text(header).font("ArialMT").moveDown(1);
    });
  }

  protected titleElement(): PDFStructureElement {
    return this.doc.struct("H2", {}, () => {
      const parts = [this.kutsuAdapter.nimi];
      this.doc.text(parts.join(", ")).font("ArialMT").moveDown();
    });
  }

  protected moreInfoElements(
    yhteystiedot: Yhteystieto[] | null | undefined,
    yhteysHenkilot?: string[] | undefined | null,
    showOrganization = true,
    pakotaProjariTaiKunnanEdustaja = false
  ): PDFKit.PDFStructureElementChild[] {
    const allYhteystiedot = this.kutsuAdapter.yhteystiedot(yhteystiedot, yhteysHenkilot, pakotaProjariTaiKunnanEdustaja);
    return allYhteystiedot.map(({ organisaatio, etunimi, sukunimi, puhelinnumero, sahkoposti }) => {
      const noSpamSahkoposti = sahkoposti.replace(/@/g, "(at)");
      const organization = showOrganization ? ` (${organisaatio}), ` : ",";
      const text = `${formatNimi({
        etunimi,
        sukunimi,
      })}${organization}\n${this.kutsuAdapter.localizedPuh} ${puhelinnumero}, ${noSpamSahkoposti} `;
      return () => {
        this.doc.text(text).moveDown();
      };
    });
  }

  protected euLogoElement(): PDFKit.PDFStructureElement {
    return this.doc.struct("DIV", {}, () => {
      this.euLogo && this.doc.image(this.euLogo, { height: 75 });
    });
  }

  asiatunnus(): string {
    return this.kutsuAdapter.asiatunnus;
  }

  async loadEuLogo(euRahoitusLogot: LocalizedMap<string>): Promise<string | Buffer | undefined> {
    const path = this.kieli === Kieli.SUOMI ? euRahoitusLogot?.SUOMI : euRahoitusLogot?.RUOTSI;
    if (path === undefined) {
      return undefined;
    }
    return fileService.getProjektiFile(this.kutsuAdapter.oid, path);
  }

  tien(): string {
    return (
      (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA
        ? this.kutsuAdapter.text("tien_rata")
        : this.kutsuAdapter.text("tien_tie")) || ""
    );
  }

  suunnitelman_isolla(): string {
    return this.kutsuAdapter.suunnitelman_isolla;
  }

  vahainen_menettely_lakiviite(): string {
    return (
      (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA
        ? this.kutsuAdapter.text("asiakirja.vahainen_menettely_lakiviite_rata")
        : this.kutsuAdapter.text("asiakirja.vahainen_menettely_lakiviite_tie")) || ""
    );
  }
}
