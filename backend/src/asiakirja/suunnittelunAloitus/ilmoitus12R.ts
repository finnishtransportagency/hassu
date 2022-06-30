import { IlmoitusAsiakirjaTyyppi, IlmoitusParams, SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { Kieli, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { AsiakirjanMuoto } from "../asiakirjaService";

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "ILMOITUS VÄYLÄVIRASTON KUULUTUKSESTA",
  RUOTSI: "TILLKÄNNAGIVANDE OM TRAFIKLEDSVERKETS KUNGÖRELSE",
};

const fileNameKeys: Record<IlmoitusAsiakirjaTyyppi, Partial<Record<ProjektiTyyppi, string>>> = {
  ILMOITUS_KUULUTUKSESTA: {
    [ProjektiTyyppi.RATA]: "12R_aloituskuulutus",
    [ProjektiTyyppi.YLEINEN]: "12YS_aloituskuulutus",
  },
  ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE: {
    [ProjektiTyyppi.RATA]: "12R_nahtavillaolo",
    [ProjektiTyyppi.YLEINEN]: "12YS_nahtavillaolo",
  },
};

export class Ilmoitus12R extends SuunnittelunAloitusPdf {
  private kuulutusOsoite = "https://www.vayla.fi/kuulutukset";

  constructor(asiakirjaTyyppi: IlmoitusAsiakirjaTyyppi, params: IlmoitusParams) {
    super(
      params,
      headers[params.kieli == Kieli.SAAME ? Kieli.SUOMI : params.kieli],
      AsiakirjanMuoto.RATA,
      fileNameKeys[asiakirjaTyyppi]?.[params.velho.tyyppi]
    ); //TODO lisää tuki Saamen eri muodoille
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    return [
      this.localizedParagraph([
        `Väylävirasto julkaisee tietoverkossaan kuulutuksen, joka koskee otsikossa mainitun ${this.projektiTyyppi}n laatimisen aloittamista. Väylävirasto saattaa asian tiedoksi julkisesti kuuluttamalla siten, kuin julkisesta kuulutuksesta säädetään hallintolaissa, sekä julkaisemalla kuulutuksen yhdessä tai useammassa alueella yleisesti ilmestyvässä sanomalehdessä. (ratalaki 95 §, HL 62 a §) `,
        `RUOTSIKSI Väylävirasto julkaisee tietoverkossaan kuulutuksen, joka koskee otsikossa mainitun ${this.projektiTyyppi}n laatimisen aloittamista. Väylävirasto saattaa asian tiedoksi julkisesti kuuluttamalla siten, kuin julkisesta kuulutuksesta säädetään hallintolaissa, sekä julkaisemalla kuulutuksen yhdessä tai useammassa alueella yleisesti ilmestyvässä sanomalehdessä. (ratalaki 95 §, HL 62 a §) `,
      ]),
      this.doc.struct("P", {}, [
        () => {
          this.doc.text(
            this.selectText([
              `Kuulutus on julkaistu ${this.kuulutusPaiva}, Väyläviraston verkkosivuilla osoitteessa `,
              `RUOTSIKSI Kuulutus on julkaistu ${this.kuulutusPaiva}, Väyläviraston verkkosivuilla osoitteessa `,
            ]),
            {
              continued: true,
            }
          );
        },
        this.doc.struct("Link", { alt: this.kuulutusOsoite }, () => {
          this.doc.fillColor("blue").text(this.kuulutusOsoite, {
            link: this.kuulutusOsoite,
            continued: true,
            underline: true,
          });
        }),
        () => {
          this.doc.fillColor("black").text(". ", { link: undefined, underline: false }).moveDown();
        },
      ]),
      this.lisatietojaAntavatParagraph(),
      this.doc.struct(
        "P",
        {},
        this.moreInfoElements(this.params.yhteystiedot, this.params.suunnitteluSopimus, this.params.yhteysHenkilot)
      ),
    ];
  }
}
