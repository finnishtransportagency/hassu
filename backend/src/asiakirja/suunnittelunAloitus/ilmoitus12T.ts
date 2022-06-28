import { IlmoitusAsiakirjaTyyppi, IlmoitusParams, SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { Kieli, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { AsiakirjanMuoto } from "../asiakirjaService";

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "ILMOITUS TOIMIVALTAISEN VIRANOMAISEN KUULUTUKSESTA",
  RUOTSI: "MEDDELANDE OM KUNGÖRELSE FRÅN BEHÖRIG MYNDIGHET",
};

const fileNameKeys: Record<IlmoitusAsiakirjaTyyppi, Partial<Record<ProjektiTyyppi, string>>> = {
  ILMOITUS_KUULUTUKSESTA: {
    [ProjektiTyyppi.TIE]: "T412_1",
    [ProjektiTyyppi.YLEINEN]: "12YS_aloituskuulutus",
  },
  ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE: {
    [ProjektiTyyppi.TIE]: "T414_1",
    [ProjektiTyyppi.YLEINEN]: "12YS_nahtavillaolo",
  },
};

export class Ilmoitus12T extends SuunnittelunAloitusPdf {
  constructor(asiakirjaTyyppi: IlmoitusAsiakirjaTyyppi, params: IlmoitusParams) {
    super(
      params,
      headers[params.kieli == Kieli.SAAME ? Kieli.SUOMI : params.kieli],
      AsiakirjanMuoto.TIE,
      fileNameKeys[asiakirjaTyyppi]?.[params.velho.tyyppi]
    ); //TODO lisää tuki Saamen eri muodoille
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    return [
      this.localizedParagraph([
        `${this.params.velho.tilaajaOrganisaatio} julkaisee tietoverkossaan liikennejärjestelmästä ja maanteistä annetun lain (503/2005) sekä hallintolain 62 a §:n mukaisesti kuulutuksen, joka koskee otsikossa mainitun ${this.projektiTyyppi}n suunnittelun ja maastotöiden aloittamista. ${this.params.velho?.tilaajaOrganisaatio} saattaa asian tiedoksi julkisesti kuuluttamalla siten, kuin julkisesta kuulutuksesta säädetään hallintolaissa, sekä julkaisemalla kuulutuksen yhdessä tai useammassa alueella yleisesti ilmestyvässä sanomalehdessä. `,
        `RUOTSIKSI ${this.params.velho.tilaajaOrganisaatio} julkaisee tietoverkossaan liikennejärjestelmästä ja maanteistä annetun lain (503/2005) sekä hallintolain 62 a §:n mukaisesti kuulutuksen, joka koskee otsikossa mainitun ${this.projektiTyyppi}n suunnittelun ja maastotöiden aloittamista. ${this.params.velho?.tilaajaOrganisaatio} saattaa asian tiedoksi julkisesti kuuluttamalla siten, kuin julkisesta kuulutuksesta säädetään hallintolaissa, sekä julkaisemalla kuulutuksen yhdessä tai useammassa alueella yleisesti ilmestyvässä sanomalehdessä. `,
      ]),

      this.doc.struct("P", {}, [
        () => {
          this.doc.text(
            this.selectText([
              `Kuulutus julkaistaan ${this.kuulutusPaiva}, ${this.tilaajaGenetiivi} tietoverkossa osoitteessa `,
              `RUOTSIKSI Kuulutus julkaistaan ${this.kuulutusPaiva}, ${this.tilaajaGenetiivi} tietoverkossa osoitteessa `,
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

  private get kuulutusOsoite() {
    return this.isVaylaTilaaja(this.params.velho)
      ? "https://www.vayla.fi/kuulutukset"
      : "https://www.ely-keskus.fi/kuulutukset";
  }
}
