import { IlmoitusAsiakirjaTyyppi, IlmoitusParams, SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { AsiakirjanMuoto } from "../asiakirjaService";

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "ILMOITUS TOIMIVALTAISEN VIRANOMAISEN KUULUTUKSESTA",
  RUOTSI: "MEDDELANDE OM KUNGÖRELSE FRÅN BEHÖRIG MYNDIGHET",
};

type PartialProjektiTyyppi = ProjektiTyyppi.TIE | ProjektiTyyppi.YLEINEN;
const fileNameKeys: Record<IlmoitusAsiakirjaTyyppi, Record<PartialProjektiTyyppi, string>> = {
  ILMOITUS_KUULUTUKSESTA: {
    [ProjektiTyyppi.TIE]: "T412_1",
    [ProjektiTyyppi.YLEINEN]: "12YS_aloituskuulutus",
  },
  ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE: {
    [ProjektiTyyppi.TIE]: "T414_1",
    [ProjektiTyyppi.YLEINEN]: "12YS_nahtavillaolo",
  },
  ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE: {
    [ProjektiTyyppi.TIE]: "T431_2",
    [ProjektiTyyppi.YLEINEN]: "12YS_hyvaksymispaatos",
  },
};

export class Ilmoitus12T extends SuunnittelunAloitusPdf {
  private asiakirjaTyyppi: IlmoitusAsiakirjaTyyppi;

  constructor(asiakirjaTyyppi: IlmoitusAsiakirjaTyyppi, params: IlmoitusParams) {
    super(
      params,
      headers[params.kieli == Kieli.SAAME ? Kieli.SUOMI : params.kieli],
      AsiakirjanMuoto.TIE,
      fileNameKeys[asiakirjaTyyppi][params.velho.tyyppi === ProjektiTyyppi.TIE ? ProjektiTyyppi.TIE : ProjektiTyyppi.YLEINEN]
    );
    this.asiakirjaTyyppi = asiakirjaTyyppi;

    this.kutsuAdapter.setTemplateResolver(this);
  }

  ilmoitus_vaihe(): string {
    switch (this.asiakirjaTyyppi) {
      case AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA:
        return this.kutsuAdapter.text("asiakirja.ilmoitus.ilmoitus_tie_vaihe_aloituskuulutus");
      case AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE:
        return this.kutsuAdapter.text("asiakirja.ilmoitus.ilmoitus_tie_vaihe_suunnitelman_nahtaville_asettamista");
      case AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE:
        return this.kutsuAdapter.text("asiakirja.ilmoitus.ilmoitus_tie_vaihe_suunnitelman_hyvaksymispaatosta");
    }
    return "";
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    return [
      this.paragraphFromKey("asiakirja.ilmoitus.tie_kappale1"),

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
      this.doc.struct("P", {}, this.moreInfoElements(this.params.yhteystiedot, this.params.suunnitteluSopimus, this.params.yhteysHenkilot)),
    ];
  }

  private get kuulutusOsoite() {
    return this.isVaylaTilaaja(this.params.velho) ? "https://www.vayla.fi/kuulutukset" : "https://www.ely-keskus.fi/kuulutukset";
  }
}
