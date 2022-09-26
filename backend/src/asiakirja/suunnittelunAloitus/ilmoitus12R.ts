import { IlmoitusAsiakirjaTyyppi, IlmoitusParams, SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { AsiakirjanMuoto } from "../asiakirjaService";

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "ILMOITUS VÄYLÄVIRASTON KUULUTUKSESTA",
  RUOTSI: "TILLKÄNNAGIVANDE OM TRAFIKLEDSVERKETS KUNGÖRELSE",
};

type PartialProjektiTyyppi = ProjektiTyyppi.RATA | ProjektiTyyppi.YLEINEN;
const fileNameKeys: Record<IlmoitusAsiakirjaTyyppi, Record<PartialProjektiTyyppi, string>> = {
  ILMOITUS_KUULUTUKSESTA: {
    [ProjektiTyyppi.RATA]: "12R_aloituskuulutus",
    [ProjektiTyyppi.YLEINEN]: "12YS_aloituskuulutus",
  },
  ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE: {
    [ProjektiTyyppi.RATA]: "12R_nahtavillaolo",
    [ProjektiTyyppi.YLEINEN]: "12YS_nahtavillaolo",
  },
  ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE: {
    [ProjektiTyyppi.RATA]: "12R_hyvaksymispaatos",
    [ProjektiTyyppi.YLEINEN]: "12YS_hyvaksymispaatos",
  },
};

export class Ilmoitus12R extends SuunnittelunAloitusPdf {
  private kuulutusOsoite = "https://www.vayla.fi/kuulutukset";
  private asiakirjaTyyppi: IlmoitusAsiakirjaTyyppi;

  constructor(asiakirjaTyyppi: IlmoitusAsiakirjaTyyppi, params: IlmoitusParams) {
    super(
      params,
      headers[params.kieli == Kieli.SAAME ? Kieli.SUOMI : params.kieli],
      AsiakirjanMuoto.RATA,
      fileNameKeys[asiakirjaTyyppi][params.velho.tyyppi === ProjektiTyyppi.RATA ? ProjektiTyyppi.RATA : ProjektiTyyppi.YLEINEN]
    );

    this.asiakirjaTyyppi = asiakirjaTyyppi;

    this.kutsuAdapter.setTemplateResolver(this);
  }

  ilmoitus_vaihe(): string {
    switch (this.asiakirjaTyyppi) {
      case AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA:
        return this.kutsuAdapter.text("asiakirja.ilmoitus.ilmoitus_rata_vaihe_aloituskuulutus");
      case AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE:
        return this.kutsuAdapter.text("asiakirja.ilmoitus.ilmoitus_rata_vaihe_suunnitelman_nahtaville_asettamista");
      case AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE:
        return this.kutsuAdapter.text("asiakirja.ilmoitus.ilmoitus_rata_vaihe_suunnitelman_hyvaksymispaatosta");
    }
    return "";
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    return [
      this.paragraphFromKey("asiakirja.ilmoitus.rata_kappale1"),
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
      this.doc.struct("P", {}, this.moreInfoElements(this.params.yhteystiedot, this.params.suunnitteluSopimus, this.params.yhteysHenkilot)),
    ];
  }
}
