import {
  SuunnitteluSopimusJulkaisu,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusJulkaisu,
} from "../../database/model";
import { AsiakirjaTyyppi, Kieli, VuorovaikutusTilaisuusTyyppi } from "../../../../common/graphql/apiModel";
import dayjs from "dayjs";
import { linkSuunnitteluVaihe } from "../../../../common/links";
import { CommonPdf } from "./commonPdf";
import { adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu } from "../../projekti/adapter/adaptToAPI";
import { findUserByKayttajatunnus } from "../../projekti/projektiUtil";
import { YleisotilaisuusKutsuPdfOptions } from "../asiakirjaTypes";
import { ASIAKIRJA_KUTSU_PREFIX, SuunnitteluVaiheKutsuAdapter } from "../adapter/suunnitteluVaiheKutsuAdapter";
import { assertIsDefined } from "../../util/assertions";
import { createPDFFileName } from "../pdfFileName";
import { kuntametadata } from "../../../../common/kuntametadata";
import PDFStructureElement = PDFKit.PDFStructureElement;

function safeConcatStrings(separator: string, strings: (string | undefined)[]): string {
  return strings.filter((s) => s).join(separator);
}

function formatTime(time: string) {
  return time.replace(":", ".");
}

export class Kutsu20 extends CommonPdf<SuunnitteluVaiheKutsuAdapter> {
  private readonly oid: string;
  private readonly vuorovaikutusKierrosJulkaisu: VuorovaikutusKierrosJulkaisu;
  protected header: string;
  protected kieli: Kieli;

  constructor(props: YleisotilaisuusKutsuPdfOptions) {
    let suunnitteluSopimusJulkaisu: SuunnitteluSopimusJulkaisu | undefined | null;
    if (props.suunnitteluSopimus) {
      assertIsDefined(props.kayttoOikeudet);
      suunnitteluSopimusJulkaisu = adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(
        props.suunnitteluSopimus,
        findUserByKayttajatunnus(props.kayttoOikeudet, props.suunnitteluSopimus?.yhteysHenkilo)
      );
    }
    const kutsuAdapter = new SuunnitteluVaiheKutsuAdapter({ ...props, suunnitteluSopimus: suunnitteluSopimusJulkaisu || undefined });
    assertIsDefined(props.vuorovaikutusKierrosJulkaisu, "vuorovaikutusKierrosJulkaisu pitää olla annettu");
    const kieli = props.kieli;
    const fileName = createPDFFileName(
      AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU,
      kutsuAdapter.asiakirjanMuoto,
      props.velho.tyyppi,
      props.kieli
    );
    super(kieli, kutsuAdapter);
    this.header = kutsuAdapter.subject;
    this.kieli = kieli;

    assertIsDefined(props.oid);
    this.oid = props.oid;
    this.vuorovaikutusKierrosJulkaisu = props.vuorovaikutusKierrosJulkaisu;
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName);
  }

  protected addContent(): void {
    const vaylaTilaaja = this.isVaylaTilaaja();
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.logo(vaylaTilaaja),
      this.headerElement(this.header),
      this.titleElement(),
      ...this.addDocumentElements(),
    ].filter((element) => element);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected titleElement(): PDFStructureElement {
    return this.doc.struct("H2", {}, () => {
      this.doc.text(this.kutsuAdapter.title).font("ArialMT").moveDown();
    });
  }

  protected get localizedKlo(): string {
    if (this.kieli == Kieli.SUOMI) {
      return "klo";
    } else {
      return "kl.";
    }
  }

  protected addDocumentElements(): PDFStructureElement[] {
    assertIsDefined(this.vuorovaikutusKierrosJulkaisu.hankkeenKuvaus);
    assertIsDefined(this.vuorovaikutusKierrosJulkaisu.vuorovaikutusTilaisuudet);
    let vuorovaikutusTilaisuudet = this.vuorovaikutusTilaisuudet(this.vuorovaikutusKierrosJulkaisu.vuorovaikutusTilaisuudet);
    if (vuorovaikutusTilaisuudet) {
      vuorovaikutusTilaisuudet.unshift(this.paragraphFromKey(ASIAKIRJA_KUTSU_PREFIX + "yleisotilaisuus_jarjestetaan"));
    } else {
      vuorovaikutusTilaisuudet = [];
    }
    return [
      this.paragraph(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "kappale1")),
      this.localizedParagraphFromMap(this.vuorovaikutusKierrosJulkaisu.hankkeenKuvaus),
      ...vuorovaikutusTilaisuudet,
      this.soittoajat(this.vuorovaikutusKierrosJulkaisu.vuorovaikutusTilaisuudet),

      this.paragraph(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "kappale2")),

      this.paragraph(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "kappale3")),

      this.tietosuojaParagraph(),

      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.vuorovaikutusKierrosJulkaisu?.yhteystiedot)),

      this.tervetuloa(),
      this.paragraph(this.kutsuAdapter.kutsujat || ""),
    ].filter((elem) => elem) as PDFStructureElement[];
  }

  private tervetuloa() {
    return this.paragraphFromKey(ASIAKIRJA_KUTSU_PREFIX + "tervetuloa");
  }

  private vuorovaikutusTilaisuudet(vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuus>): PDFStructureElement[] | undefined {
    const elements: PDFStructureElement[] = vuorovaikutusTilaisuudet
      .map((tilaisuus) => {
        const time = this.formatTilaisuusTime.call(this, tilaisuus);

        const baseline = -7; // Tried with "alphabetic", but doesn't work https://github.com/foliojs/pdfkit/issues/994
        if (tilaisuus.tyyppi == VuorovaikutusTilaisuusTyyppi.VERKOSSA) {
          // tilaisuus.linkki on oltava, koska tilaisuustyyppi on VERKOSSA
          assertIsDefined(tilaisuus.linkki);
          return this.doc.struct("P", {}, [
            () => {
              this.doc.font("ArialMTBold");
              this.doc.text(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "aika") + ": ", {
                baseline,
                continued: true,
              });
              this.doc.font("ArialMT");
              this.doc.text(time, {
                baseline,
                continued: false,
              });
              this.doc.font("ArialMTBold");
              this.doc.text(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "paikka") + ": ", {
                baseline,
                continued: true,
              });
              this.doc.font("ArialMT");
              this.doc.text(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "teams_linkki") + " ", {
                baseline,
                continued: true,
              });
            },
            this.doc.struct("Link", { alt: tilaisuus.linkki }, () => {
              const link = linkSuunnitteluVaihe(this.oid);
              this.doc.fillColor("blue").text(link, {
                baseline,
                link,
                continued: true,
                underline: true,
              });
              this.doc.fillColor("black").text("", { baseline, link: undefined, underline: false, continued: false }).moveDown(3);
            }),
          ]);
        } else if (tilaisuus.tyyppi == VuorovaikutusTilaisuusTyyppi.PAIKALLA) {
          return this.doc.struct("P", {}, [
            () => {
              this.doc.font("ArialMTBold");
              this.doc.text(this.selectText([`Aika: `, ``]), {
                baseline: "alphabetic",
                continued: true,
              });
              this.doc.font("ArialMT");
              this.doc.text(time, {
                baseline: "alphabetic",
                continued: false,
              });
              this.doc.font("ArialMTBold");
              this.doc.text(this.selectText([`Paikka: `, ``]), {
                baseline: "alphabetic",
                continued: true,
              });
              this.doc.font("ArialMT");

              // tilaisuus.paikka on oltava, koska tilaisuustyyppi on PAIKALLA
              assertIsDefined(tilaisuus.paikka);
              // tilaisuus.osoite, tilaisuus.postinumero on oltava, koska tilaisuustyyppi on PAIKALLA
              assertIsDefined(tilaisuus.postinumero);
              assertIsDefined(tilaisuus.postitoimipaikka);
              const place = safeConcatStrings(", ", [
                tilaisuus.paikka,
                [tilaisuus.osoite, safeConcatStrings(" ", [tilaisuus.postinumero, tilaisuus.postitoimipaikka])].join(", "),
              ]);
              this.doc
                .text(place, {
                  baseline: "alphabetic",
                })
                .moveDown();
            },
          ]);
        }
      })
      .filter((p) => !!p) as PDFStructureElement[];
    if (elements.length == 0) {
      return undefined;
    }
    return elements;
  }

  protected soittoajat(vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuusJulkaisu>): PDFStructureElement | undefined {
    const soittoaikaTilaisuudet = vuorovaikutusTilaisuudet.filter(
      (tilaisuus) => tilaisuus.tyyppi == VuorovaikutusTilaisuusTyyppi.SOITTOAIKA
    );
    if (soittoaikaTilaisuudet.length == 0) {
      return;
    }

    return this.doc.struct("P", {}, [
      () => {
        this.doc.text(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "soittoaika_lisatietoja")).moveDown();

        soittoaikaTilaisuudet.forEach((tilaisuus) => {
          const time = this.formatTilaisuusTime(tilaisuus);
          this.doc.text(time);

          if (tilaisuus.yhteystiedot) {
            tilaisuus.yhteystiedot.forEach((yhteystieto) => {
              const { etunimi, sukunimi, kunta, puhelinnumero } = yhteystieto;
              let organisaatio = "";
              if (kunta) {
                organisaatio = ` (${kuntametadata.nameForKuntaId(kunta, this.kieli)})`;
              } else if (yhteystieto.organisaatio) {
                organisaatio = ` (${yhteystieto.organisaatio})`;
              }
              this.doc.text(`${etunimi} ${sukunimi}${organisaatio}, ${puhelinnumero}`);
            });
          }
          this.doc.moveDown();
        });
      },
    ]);
  }

  private formatTilaisuusTime(tilaisuus: VuorovaikutusTilaisuus) {
    return `${dayjs(tilaisuus.paivamaara).format("DD.MM.YYYY")} ${this.localizedKlo} ${formatTime(tilaisuus.alkamisAika)} - ${formatTime(
      tilaisuus.paattymisAika
    )}`;
  }
}
