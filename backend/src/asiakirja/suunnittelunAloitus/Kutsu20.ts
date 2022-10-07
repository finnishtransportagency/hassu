import {
  DBVaylaUser,
  SuunnitteluSopimusJulkaisu,
  SuunnitteluVaihe,
  Velho,
  Vuorovaikutus,
  VuorovaikutusTilaisuus,
} from "../../database/model";
import { KayttajaTyyppi, Kieli, ProjektiTyyppi, VuorovaikutusTilaisuusTyyppi } from "../../../../common/graphql/apiModel";
import { formatProperNoun } from "../../../../common/util/formatProperNoun";
import dayjs from "dayjs";
import { linkSuunnitteluVaihe } from "../../../../common/links";
import { CommonPdf } from "./commonPdf";
import { translate } from "../../util/localization";
import { formatList, KutsuAdapter } from "./KutsuAdapter";
import { adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu } from "../../projekti/adapter/adaptToAPI";
import { findUserByKayttajatunnus } from "../../projekti/projektiUtil";
import PDFStructureElement = PDFKit.PDFStructureElement;
import { AsiakirjanMuoto, YleisotilaisuusKutsuPdfOptions } from "../asiakirjaTypes";

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "KUTSU TIEDOTUS- / YLEISÖTILAISUUTEEN",
  RUOTSI: "INBJUDAN TILL DISKUSSION",
};

const fileNamePrefix: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "Yleisötilaisuus kutsu",
  RUOTSI: "INBJUDAN TILL DISKUSSION",
};

function safeConcatStrings(separator: string, strings: (string | undefined)[]): string {
  return strings.filter((s) => s).join(separator);
}

function formatTime(time: string) {
  return time.replace(":", ".");
}

function createFileName(kieli: Kieli, asiakirjanMuoto: AsiakirjanMuoto, tyyppi: ProjektiTyyppi) {
  const language = kieli == Kieli.SAAME ? Kieli.SUOMI : kieli;
  const asiakirjaTyyppi = asiakirjanMuoto == AsiakirjanMuoto.TIE ? "Tie" : "Rata";
  return projektiTyyppiToFilenamePrefix(tyyppi) + " " + asiakirjaTyyppi + " " + fileNamePrefix[language];
}

export class Kutsu20 extends CommonPdf {
  private readonly suunnitteluVaihe: SuunnitteluVaihe;
  private readonly asiakirjanMuoto: AsiakirjanMuoto;
  private readonly oid: string;
  private readonly vuorovaikutus: Vuorovaikutus;
  private readonly kayttoOikeudet: DBVaylaUser[];
  protected header: string;
  protected kieli: Kieli;
  private suunnitteluSopimus: SuunnitteluSopimusJulkaisu | undefined;
  private readonly velho: Velho;

  constructor({
    oid,
    velho,
    vuorovaikutus,
    kieli,
    kayttoOikeudet,
    asiakirjanMuoto,
    kielitiedot,
    suunnitteluSopimus,
    suunnitteluVaihe,
  }: YleisotilaisuusKutsuPdfOptions) {
    if (!(velho && velho.tyyppi && kielitiedot && suunnitteluVaihe)) {
      throw new Error("Projektilta puuttuu tietoja!");
    }
    const fileName = createFileName(kieli, asiakirjanMuoto, velho.tyyppi);
    const kutsuAdapter = new KutsuAdapter({
      oid,
      kielitiedot,
      velho,
      kieli,
      asiakirjanMuoto,
      projektiTyyppi: velho.tyyppi,
      kayttoOikeudet,
    });
    super(kieli, kutsuAdapter);
    const language = kieli == Kieli.SAAME ? Kieli.SUOMI : kieli;
    this.header = headers[language];
    this.kieli = kieli;
    this.velho = velho;

    this.kayttoOikeudet = kayttoOikeudet;
    const suunnitteluSopimusJulkaisu = adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(
      oid,
      suunnitteluSopimus,
      findUserByKayttajatunnus(kayttoOikeudet, suunnitteluSopimus?.yhteysHenkilo)
    );
    this.suunnitteluSopimus = suunnitteluSopimusJulkaisu || undefined;
    this.oid = oid;
    this.suunnitteluVaihe = suunnitteluVaihe;
    this.vuorovaikutus = vuorovaikutus;
    this.asiakirjanMuoto = asiakirjanMuoto;
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName);
  }

  protected addContent(): void {
    const vaylaTilaaja = this.isVaylaTilaaja(this.velho);
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
    const suunnitteluvaihePublicLink = linkSuunnitteluVaihe(this.oid);
    return [
      this.paragraph(this.startOfPlanningPhrase),
      // tässä vaiheessa hankkenKuvaus on oltava
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.localizedParagraphFromMap(this.suunnitteluVaihe.hankkeenKuvaus),
      this.localizedParagraph([`Yleisötilaisuus järjestetään:`, "", ""]),
      // vuorovaikutuksella on oltava vuorovaikutusTilaisuudet
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ...this.vuorovaikutusTilaisuudet(this.vuorovaikutus.vuorovaikutusTilaisuudet),

      this.doc.struct("P", {}, [
        () => {
          this.doc.text(
            this.selectText([
              "Tilaisuudessa voi tutustua suunnitelmaluonnoksiin ja esittää niistä mielipiteensä. Tilaisuudessa esitettäviin suunnitelmaluonnoksiin voi tutustua ennakkoon tietoverkossa ",
              `RUOTSIKSI Tilaisuudessa voi tutustua suunnitelmaluonnoksiin ja esittää niistä mielipiteensä. Tilaisuudessa esitettäviin suunnitelmaluonnoksiin voi tutustua ennakkoon tietoverkossa `,
            ]),
            { continued: true }
          );
        },
        this.doc.struct("Link", { alt: suunnitteluvaihePublicLink }, () => {
          this.doc.fillColor("blue").text(suunnitteluvaihePublicLink, {
            link: suunnitteluvaihePublicLink,
            continued: true,
            underline: true,
          });
        }),
        () => {
          this.doc.fillColor("black").text("", { link: undefined, underline: false }).moveDown(2);
        },
      ]),

      this.localizedParagraph(["Tilaisuus on avoin kaikille alueen asukkaille, maanomistajille ja muille asiasta kiinnostuneille."]),

      this.tietosuojaParagraph(),

      this.localizedParagraph([
        "Kutsu on julkaistu tietoverkossa verkkosivuilla " +
          dayjs(this.vuorovaikutus.vuorovaikutusJulkaisuPaiva).format("DD.MM.YYYY") +
          ".",
      ]),
      // vuorovaikutuksella on oltava vuorovaikutusTilaisuudet
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.soittoajat(this.vuorovaikutus.vuorovaikutusTilaisuudet),

      this.lisatietojaAntavatParagraph(),
      this.doc.struct(
        "P",
        {},
        this.moreInfoElements(
          this.vuorovaikutus?.esitettavatYhteystiedot?.yhteysTiedot,
          this.suunnitteluSopimus,
          this.vuorovaikutus?.esitettavatYhteystiedot?.yhteysHenkilot,
          false
        )
      ),

      this.tervetuloa(),
      this.kutsuja(),
    ].filter((elem) => elem);
  }

  private kutsuja() {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return this.paragraph(this.kutsuAdapter.tilaajaOrganisaatio);
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return this.paragraph(translate("vaylavirasto", this.kieli));
    }
  }

  private tervetuloa() {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return this.localizedParagraph(["Tervetuloa!"]);
    }
  }

  private get startOfPlanningPhrase() {
    let organisaatiotText: string;
    let laatii: string;
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      const tilaajaOrganisaatio = this.kutsuAdapter.tilaajaOrganisaatio;
      const kunnat = this.velho?.kunnat;
      const organisaatiot = kunnat ? [tilaajaOrganisaatio, ...kunnat] : [tilaajaOrganisaatio];
      const trimmattutOrganisaatiot = organisaatiot.map((organisaatio) => formatProperNoun(organisaatio));
      const viimeinenOrganisaatio = trimmattutOrganisaatiot.slice(-1);
      const muut = trimmattutOrganisaatiot.slice(0, -1);
      organisaatiotText = formatList([...muut, ...viimeinenOrganisaatio], this.kieli);
      if (this.kieli == Kieli.SUOMI) {
        laatii = muut.length > 0 ? "laativat" : "laatii";
      } else {
        laatii = "utarbetar";
      }
    } else {
      organisaatiotText = translate("vaylavirasto", this.kieli) || "";
      if (!organisaatiotText) {
        throw new Error("Käännös puuttuu!");
      }
      if (this.kieli == Kieli.SUOMI) {
        laatii = "laatii";
      } else {
        laatii = "utarbetar";
      }
    }
    return `${organisaatiotText} ${laatii} ${this.kutsuAdapter.suunnitelmaa} ${this.kutsuAdapter.nimi}`;
  }

  private vuorovaikutusTilaisuudet(vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuus>) {
    const elements = vuorovaikutusTilaisuudet.map((tilaisuus) => {
      const time = this.formatTilaisuusTime.call(this, tilaisuus);

      const baseline = -7; // Tried with "alphabetic", but doesn't work https://github.com/foliojs/pdfkit/issues/994
      if (tilaisuus.tyyppi == VuorovaikutusTilaisuusTyyppi.VERKOSSA) {
        return this.doc.struct("P", {}, [
          () => {
            this.doc.font("ArialMTBold");
            this.doc.text(this.selectText([`Aika: `, `Tid:`]), {
              baseline,
              continued: true,
            });
            this.doc.font("ArialMT");
            this.doc.text(time, {
              baseline,
              continued: false,
            });
            this.doc.font("ArialMTBold");
            this.doc.text(this.selectText([`Paikka: `, `Plats:`]), {
              baseline,
              continued: true,
            });
            this.doc.font("ArialMT");
            this.doc.text(this.selectText(["Teams-linkki ", "Teams-linkki "]), {
              baseline,
              continued: true,
            });
          },
          // tilaisuus.linkki on oltava, koska tilaisuustyyppi on VERKOSSA
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
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

            const place = safeConcatStrings(", ", [
              // tilaisuus.paikka on oltava, koska tilaisuustyyppi on PAIKALLA
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              tilaisuus.paikka,
              // tilaisuus.osoite, tilaisuus.postinumero on oltava, koska tilaisuustyyppi on PAIKALLA
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
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
    });
    if (elements.length == 0) {
      return undefined;
    }
    return elements;
  }

  protected soittoajat(vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuus>): PDFStructureElement | undefined {
    const soittoaikaTilaisuudet = vuorovaikutusTilaisuudet.filter(
      (tilaisuus) => tilaisuus.tyyppi == VuorovaikutusTilaisuusTyyppi.SOITTOAIKA
    );
    if (soittoaikaTilaisuudet.length == 0) {
      return;
    }

    return this.doc.struct("P", {}, [
      () => {
        this.doc
          .text(
            this.selectText([
              "Suunnitelmaluonnoksista voi kysyä lisätietoja tai antaa palautetta soittamalla suunnittelijalle puhelinaikoina:",
              "För att få mer information om planutkasten eller för att ge respons ring planeraren under telefontiderna:",
            ])
          )
          .moveDown();

        soittoaikaTilaisuudet.forEach((tilaisuus) => {
          const time = this.formatTilaisuusTime(tilaisuus);
          this.doc.text(time);

          if (tilaisuus.esitettavatYhteystiedot?.yhteysHenkilot) {
            tilaisuus.esitettavatYhteystiedot?.yhteysHenkilot.forEach((kayttajatunnus) => {
              const user = this.kayttoOikeudet.filter((kayttaja) => kayttaja.kayttajatunnus == kayttajatunnus).pop();
              if (user) {
                const role = user.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO ? translate("rooli.PROJEKTIPAALLIKKO", this.kieli) : undefined;
                this.doc.text(safeConcatStrings(", ", [user.nimi, role, user.puhelinnumero]));
              }
            });
          }

          if (tilaisuus.esitettavatYhteystiedot?.yhteysTiedot) {
            tilaisuus.esitettavatYhteystiedot.yhteysTiedot.forEach((yhteystieto) => {
              this.doc.text(
                safeConcatStrings(", ", [`${yhteystieto.etunimi} ${yhteystieto.sukunimi}`, yhteystieto.titteli, yhteystieto.puhelinnumero])
              );
            });
            this.doc.text("").moveDown();
          }
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

export const projektiTyyppiToFilenamePrefix = (projektiTyyppi: ProjektiTyyppi): string =>
  ({
    [ProjektiTyyppi.YLEINEN]: "YS",
    [ProjektiTyyppi.TIE]: "TS",
    [ProjektiTyyppi.RATA]: "RS",
  }[projektiTyyppi]);
