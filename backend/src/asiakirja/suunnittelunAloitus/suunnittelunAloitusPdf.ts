import log from "loglevel";
import { ProjektiTyyppi, Yhteystieto } from "../../../../common/graphql/apiModel";
import { DBProjekti } from "../../database/model/projekti";
import { AbstractPdf } from "../abstractPdf";

export abstract class SuunnittelunAloitusPdf extends AbstractPdf {
  protected projekti: DBProjekti;
  protected header: string;

  constructor(projekti: DBProjekti, header: string) {
    super(header + "; " + projekti?.velho.nimi);
    this.header = header;
    this.projekti = projekti;
  }

  protected get isVaylaTilaaja() {
    return this.projekti.velho.tilaajaOrganisaatio === "Väylävirasto";
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
    switch (this.projekti.tyyppi) {
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
    const suunnitteluSopimus = this.projekti.suunnitteluSopimus;
    if (suunnitteluSopimus) {
      const { email, puhelinnumero, sukunimi, etunimi, kunta } = suunnitteluSopimus;
      yt.push({
        etunimi,
        sukunimi,
        puhelinnumero,
        sahkoposti: email,
        organisaatio: this.capitalize(kunta),
        __typename: "Yhteystieto",
      });
    }
    this.projekti.kayttoOikeudet
      .filter(({ esitetaanKuulutuksessa }) => !!esitetaanKuulutuksessa)
      .forEach((oikeus) => {
        yt.push({
          etunimi: oikeus.nimi.replace(/,/g, ""),
          sukunimi: "",
          puhelinnumero: oikeus.puhelinnumero,
          sahkoposti: oikeus.email,
          organisaatio: oikeus.organisaatio,
          __typename: "Yhteystieto",
        });
      });
    if (this.projekti.aloitusKuulutus?.esitettavatYhteystiedot) {
      this.projekti.aloitusKuulutus?.esitettavatYhteystiedot.forEach((yhteystieto) => {
        yt.push(yhteystieto);
      });
    }
    return yt;
  }

  protected get moreInfoElements(): PDFKit.PDFStructureElementChild[] {
    const structureElements = this.yhteystiedot.map(
      ({ organisaatio, etunimi, sukunimi, puhelinnumero, sahkoposti }) => {
        const element: PDFKit.PDFStructureElementChild = () => {
          const nimi = etunimi + (!!sukunimi ? " " + sukunimi : "");
          const noSpamSahkoposti = sahkoposti.replace(/@/g, "(at)");
          this.doc.text(`${organisaatio}, ${nimi}, puh. ${puhelinnumero}, ${noSpamSahkoposti} `).moveDown();
        };
        return element;
      }
    );
    return structureElements;
  }

  protected get kuulutusPaiva() {
    return this.projekti.aloitusKuulutus?.kuulutusPaiva
      ? new Date(this.projekti.aloitusKuulutus?.kuulutusPaiva).toLocaleDateString("fi")
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
      const parts = [this.projekti.velho?.nimi];
      parts.push(this.projektiTyyppi);
      this.doc.text(parts.join(", ")).font("ArialMT").moveDown();
    });
  }

  protected get tilaajaGenetiivi() {
    return this.projekti.velho?.tilaajaOrganisaatio
      ? this.projekti.velho?.tilaajaOrganisaatio === "Väylävirasto"
        ? "Väyläviraston"
        : this.projekti.velho?.tilaajaOrganisaatio?.slice(0, -1) + "ksen"
      : "Tilaajaorganisaation";
  }
}
