import {
  SuunnitteluSopimus,
  SuunnitteluSopimusJulkaisu,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusJulkaisu,
} from "../../database/model";
import { AsiakirjaTyyppi, Kieli, VuorovaikutusTilaisuusTyyppi } from "hassu-common/graphql/apiModel";
import dayjs from "dayjs";
import { linkSuunnitteluVaihe } from "hassu-common/links";
import { CommonPdf } from "./commonPdf";
import { adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu } from "../../projekti/adapter/common/adaptSuunnitteluSopimusToJulkaisu";
import { findUserByKayttajatunnus } from "../../projekti/projektiUtil";
import { YleisotilaisuusKutsuPdfOptions } from "../asiakirjaTypes";
import { ASIAKIRJA_KUTSU_PREFIX, SuunnitteluVaiheKutsuAdapter } from "../adapter/suunnitteluVaiheKutsuAdapter";
import { assertIsDefined } from "../../util/assertions";
import { createPDFFileName } from "../pdfFileName";
import { kuntametadata } from "hassu-common/kuntametadata";
import { organisaatioIsEly } from "hassu-common/util/organisaatioIsEly";
import { translate } from "../../util/localization";
import PDFStructureElement = PDFKit.PDFStructureElement;
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

function safeConcatStrings(separator: string, strings: (string | undefined)[]): string {
  return strings.filter((s) => s).join(separator);
}

function formatTime(time: string) {
  return time.replace(":", ".");
}

const baseline = -7; // Tried with "alphabetic", but doesn't work https://github.com/foliojs/pdfkit/issues/994

export class Kutsu20 extends CommonPdf<SuunnitteluVaiheKutsuAdapter> {
  private readonly vuorovaikutusKierrosJulkaisu: VuorovaikutusKierrosJulkaisu;
  protected header: string;
  protected readonly kuulutettuYhdessaSuunnitelmanimi: string | undefined;
  protected kieli: KaannettavaKieli;

  constructor(props: YleisotilaisuusKutsuPdfOptions) {
    let suunnitteluSopimusJulkaisu: SuunnitteluSopimusJulkaisu | undefined | null;
    if (props.suunnitteluSopimus) {
      assertIsDefined(props.kayttoOikeudet);
      if (props.suunnitteluSopimus?.yhteysHenkilo) {
        suunnitteluSopimusJulkaisu = adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(
          props.oid,
          props.suunnitteluSopimus,
          findUserByKayttajatunnus(props.kayttoOikeudet, props.suunnitteluSopimus.yhteysHenkilo)
        );
      } else {
        suunnitteluSopimusJulkaisu = adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(props.oid, props.suunnitteluSopimus, undefined);
      }
    }
    const kutsuAdapter = new SuunnitteluVaiheKutsuAdapter({ ...props, suunnitteluSopimus: suunnitteluSopimusJulkaisu ?? undefined });
    assertIsDefined(props.vuorovaikutusKierrosJulkaisu, "vuorovaikutusKierrosJulkaisu pitää olla annettu");
    const kieli = props.kieli;
    const fileName = createPDFFileName(
      AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU,
      kutsuAdapter.asiakirjanMuoto,
      props.velho.tyyppi,
      props.kieli
    );
    super(kieli, props.oid, kutsuAdapter);
    this.header = kutsuAdapter.subject;
    this.kieli = kieli;

    assertIsDefined(props.oid);
    this.oid = props.oid;
    this.vuorovaikutusKierrosJulkaisu = props.vuorovaikutusKierrosJulkaisu;
    this.kuulutettuYhdessaSuunnitelmanimi = props.kuulutettuYhdessaSuunnitelmanimi;
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName, props.suunnitteluSopimus, baseline);
  }

  protected addContent(): void {
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.headerElement(this.header),
      this.titleElement(),
      ...this.addDocumentElements(),
      this.euLogoElement(),
      this.sopimusLogoElement(),
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
    return [
      this.paragraphFromKey(ASIAKIRJA_KUTSU_PREFIX + "kappale1"),
      this.localizedParagraphFromMap(this.vuorovaikutusKierrosJulkaisu.hankkeenKuvaus),
      this.kuulutettuYhdessaSuunnitelmaParagraph(),
      ...(this.vuorovaikutusTilaisuudet(
        this.vuorovaikutusKierrosJulkaisu.vuorovaikutusTilaisuudet,
        VuorovaikutusTilaisuusTyyppi.VERKOSSA
      ) ?? []),
      ...(this.vuorovaikutusTilaisuudet(
        this.vuorovaikutusKierrosJulkaisu.vuorovaikutusTilaisuudet,
        VuorovaikutusTilaisuusTyyppi.PAIKALLA
      ) ?? []),
      ...this.soittoajat(this.vuorovaikutusKierrosJulkaisu.vuorovaikutusTilaisuudet),

      this.paragraphFromKey(ASIAKIRJA_KUTSU_PREFIX + "kappale2"),

      this.paragraphFromKey(ASIAKIRJA_KUTSU_PREFIX + "kappale3"),

      this.paragraphFromKey(ASIAKIRJA_KUTSU_PREFIX + "kappale4"),

      this.tietosuojaParagraph(),

      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.vuorovaikutusKierrosJulkaisu?.yhteystiedot)),

      this.tervetuloa(),
      this.paragraph(this.kutsuAdapter.kutsujat ?? ""),
    ].filter((elem): elem is PDFStructureElement => !!elem);
  }

  private tervetuloa() {
    return this.paragraphFromKey(ASIAKIRJA_KUTSU_PREFIX + "tervetuloa");
  }

  private vuorovaikutusTilaisuudet(
    vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuus>,
    tyyppi: VuorovaikutusTilaisuusTyyppi
  ): PDFStructureElement[] | undefined {
    const tilaisuudetOfSpecificType = vuorovaikutusTilaisuudet.filter((tilaisuus) => tilaisuus.tyyppi == tyyppi);
    if (!tilaisuudetOfSpecificType.length) {
      return undefined;
    }

    const elements: PDFStructureElement[] = tilaisuudetOfSpecificType
      .map((tilaisuus) => {
        const time = this.formatTilaisuusTime(tilaisuus);

        if (tilaisuus.tyyppi == VuorovaikutusTilaisuusTyyppi.VERKOSSA) {
          // tilaisuus.linkki on oltava, koska tilaisuustyyppi on VERKOSSA
          return this.verkkoVuorovaikutusTilaisuus(tilaisuus, time);
        } else if (tilaisuus.tyyppi == VuorovaikutusTilaisuusTyyppi.PAIKALLA) {
          return this.paikallaVuorovaikutusTilaisuus(tilaisuus, time);
        }
      })
      .filter((p) => !!p) as PDFStructureElement[];
    if (elements.length == 0) {
      return undefined;
    }

    if (tyyppi == VuorovaikutusTilaisuusTyyppi.PAIKALLA) {
      elements.unshift(this.paragraphFromKey(ASIAKIRJA_KUTSU_PREFIX + "yleisotilaisuus_jarjestetaan", { spacingAfter: 1 }));
    } else if (tyyppi == VuorovaikutusTilaisuusTyyppi.VERKOSSA) {
      elements.unshift(this.paragraphFromKey(ASIAKIRJA_KUTSU_PREFIX + "verkkotilaisuus_jarjestetaan", { spacingAfter: 1 }));
    }
    elements.push(this.doc.struct("P", {}, () => this.doc.moveDown()));
    return elements;
  }

  private paikallaVuorovaikutusTilaisuus(tilaisuus: VuorovaikutusTilaisuus, time: string): PDFStructureElement | undefined {
    return this.doc.struct("P", {}, [
      () => {
        this.insertLabelAndText(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "aika") + ": ", time);
        this.insertTilaisuusNimi(tilaisuus);
        this.doc.font("ArialMTBold");
        this.doc.text(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "paikka") + ": ", {
          baseline,
          continued: true,
        });
        this.doc.font("ArialMT");
        // tilaisuus.osoite, tilaisuus.postinumero on oltava, koska tilaisuustyyppi on PAIKALLA
        assertIsDefined(tilaisuus.postinumero);
        const place = safeConcatStrings(", ", [
          tilaisuus.paikka?.[this.kieli] ?? undefined,
          [
            tilaisuus.osoite?.[this.kieli],
            safeConcatStrings(" ", [tilaisuus.postinumero, tilaisuus.postitoimipaikka?.[this.kieli] ?? undefined]),
          ].join(", "),
        ]);
        this.doc.text(place, {
          baseline,
        });
        const lisatiedot = tilaisuus.lisatiedot?.[this.kieli];
        if (lisatiedot !== undefined) {
          this.doc.font("ArialMTBold");
          this.doc.text(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "lisatiedot") + ": ", {
            baseline,
            continued: true,
          });
          this.doc.font("ArialMT");
          this.doc.text(lisatiedot);
        }
        this.doc.moveDown();
      },
    ]);
  }

  private verkkoVuorovaikutusTilaisuus(tilaisuus: VuorovaikutusTilaisuus, time: string) {
    assertIsDefined(tilaisuus.linkki);
    return this.doc.struct("P", {}, [
      () => {
        this.insertLabelAndText(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "aika") + ": ", time);
        this.insertTilaisuusNimi(tilaisuus);

        this.doc.font("ArialMTBold");
        this.doc.text(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "linkki_tilaisuuteen") + ": ", {
          baseline,
          continued: true,
        });
        this.doc.font("ArialMT");
      },
      this.doc.struct("Link", { alt: tilaisuus.linkki }, () => {
        const link = linkSuunnitteluVaihe(this.kutsuAdapter.linkableProjekti, this.kieli);
        this.doc.fillColor("blue").text(link, {
          baseline,
          link,
          continued: true,
          underline: true,
        });
      }),
      () => {
        const lisatiedot = tilaisuus.lisatiedot?.[this.kieli];
        this.doc
          .fillColor("black")
          .text("", { baseline, link: undefined, underline: false, continued: false })
          .moveDown(lisatiedot ? 1 : 2);
        if (lisatiedot !== undefined) {
          this.doc.fillColor("black").font("ArialMTBold");
          this.doc.text(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "lisatiedot") + ": ", {
            baseline,
            continued: true,
            underline: false,
          });
          this.doc.font("ArialMT");
          this.doc.text(lisatiedot).moveDown();
        }
      },
    ]);
  }

  private insertTilaisuusNimi(tilaisuus: VuorovaikutusTilaisuus) {
    if (tilaisuus.nimi) {
      const nimi = tilaisuus.nimi[this.kieli];
      if (nimi) {
        this.insertLabelAndText(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "tilaisuuden_nimi") + ": ", nimi);
      }
    }
  }

  private insertLabelAndText(label: string, text: string) {
    this.doc.font("ArialMTBold");
    this.doc.text(label, {
      baseline,
      continued: true,
    });
    this.doc.font("ArialMT");
    this.doc.text(text, {
      baseline,
      continued: false,
    });
  }

  protected soittoajat(vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuusJulkaisu>): PDFStructureElement[] {
    const soittoaikaTilaisuudet = vuorovaikutusTilaisuudet.filter(
      (tilaisuus) => tilaisuus.tyyppi == VuorovaikutusTilaisuusTyyppi.SOITTOAIKA
    );
    if (soittoaikaTilaisuudet.length == 0) {
      return [];
    }

    return [
      this.paragraphFromKey(ASIAKIRJA_KUTSU_PREFIX + "soittoajat", { spacingAfter: 1 }),
      this.paragraphFromKey(ASIAKIRJA_KUTSU_PREFIX + "soittoaika_lisatietoja"),
      this.doc.struct("P", {}, [
        () => {
          this.soittoajanVastaanottajatLista(soittoaikaTilaisuudet);
        },
      ]),
    ];
  }

  private soittoajanVastaanottajatLista(soittoaikaTilaisuudet: VuorovaikutusTilaisuusJulkaisu[]) {
    soittoaikaTilaisuudet.forEach((tilaisuus, index) => {
      this.insertLabelAndText(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "aika") + ": ", this.formatTilaisuusTime(tilaisuus));
      this.insertTilaisuusNimi(tilaisuus);

      if (tilaisuus.yhteystiedot) {
        tilaisuus.yhteystiedot.forEach((yhteystieto) => {
          const { etunimi, sukunimi, kunta, puhelinnumero } = yhteystieto;
          let organisaatio = "";
          if (kunta) {
            organisaatio = ` (${kuntametadata.nameForKuntaId(kunta, this.kieli)})`;
          } else if (organisaatioIsEly(yhteystieto.organisaatio) && yhteystieto.elyOrganisaatio) {
            const kaannos = translate(`viranomainen.${yhteystieto.elyOrganisaatio}`, this.kieli);
            organisaatio = ` (${kaannos ?? yhteystieto.organisaatio})`;
          } else if (yhteystieto.organisaatio) {
            const orgKey = yhteystieto.organisaatio.toUpperCase().replace(/Ä/g, "A").replace(/Ö/g, "O").replace(/ /g, "_");
            const kaannos = translate(`viranomainen.${orgKey}`, this.kieli);
            organisaatio = ` (${kaannos ?? yhteystieto.organisaatio})`;
          }
          this.doc.text(`${etunimi} ${sukunimi}${organisaatio},\n${this.kutsuAdapter.localizedPuh} ${puhelinnumero}`, { baseline });
        });
      }
      if (tilaisuus.lisatiedot?.[this.kieli] !== undefined) {
        this.doc.fillColor("black").font("ArialMTBold");
        this.doc.text(this.kutsuAdapter.text(ASIAKIRJA_KUTSU_PREFIX + "lisatiedot") + ": ", {
          baseline,
          continued: true,
        });
        this.doc.font("ArialMT");
        this.doc.text(tilaisuus.lisatiedot[this.kieli] as string);
      }
      const line = index === soittoaikaTilaisuudet.length - 1 ? 2 : 1;
      this.doc.moveDown(line);
    });
  }

  private formatTilaisuusTime(tilaisuus: VuorovaikutusTilaisuus) {
    return `${dayjs(tilaisuus.paivamaara).format("DD.MM.YYYY")} ${this.localizedKlo} ${formatTime(tilaisuus.alkamisAika)} - ${formatTime(
      tilaisuus.paattymisAika
    )}`;
  }

  protected kuulutettuYhdessaSuunnitelmaParagraph(): PDFStructureElement | undefined {
    if (this.kuulutettuYhdessaSuunnitelmanimi) {
      return this.paragraphFromKey("liittyvat-suunnitelmat.kuulutettu-yhdessa-pdf");
    }
  }
}
