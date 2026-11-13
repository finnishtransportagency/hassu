// Contains code generated or recommended by Amazon Q
import { SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { HyvaksymisPaatosVaiheKutsuAdapterProps } from "../adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import { AsiakirjaTyyppi, ProjektiTyyppi } from "hassu-common/graphql/apiModel";

export type IlmoitusMaakuntaliitoilleAsiakirjaTyyppi = Extract<
  AsiakirjaTyyppi,
  AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MAAKUNTALIITOILLE
>;

export class IlmoitusMaakuntaliitoille extends SuunnittelunAloitusPdf {
  constructor(asiakirjaTyyppi: IlmoitusMaakuntaliitoilleAsiakirjaTyyppi, params: HyvaksymisPaatosVaiheKutsuAdapterProps) {
    let headerKey: string;
    if (params.velho.tyyppi === ProjektiTyyppi.TOIMINNALLINEN) {
      headerKey = "asiakirja.ilmoitus.otsikko_ilmoitus_kuulutuksesta_toiminnallinen";
    } else if (params.suunnitteluSopimus) {
      headerKey = "asiakirja.ilmoitus.otsikko_ilmoitus_kuulutuksesta_suunnittelusopimus";
    } else {
      headerKey = "asiakirja.ilmoitus.otsikko_ilmoitus_kuulutuksesta";
    }
    super(params, headerKey, asiakirjaTyyppi);
    this.kutsuAdapter.addTemplateResolver(this);
  }

  ilmoituksen_vastaanottajille(): string {
    return this.kutsuAdapter.text("asiakirja.jatkopaatoksesta_ilmoittaminen.maakunnalle");
  }

  ilmoitus_vaihe(): string {
    return this.kutsuAdapter.text("asiakirja.ilmoitus.ilmoitus_vaihe_suunnitelman_hyvaksymispaatosta");
  }

  ilmoitus_vaihe_pitka(): string {
    if (this.kutsuAdapter.projektiTyyppi === ProjektiTyyppi.TOIMINNALLINEN) {
      return this.kutsuAdapter.text("asiakirja.ilmoitus.ilmoitus_vaihe_suunnitelman_hyvaksymispaatosta_pitka_toiminnallinen");
    }
    return this.kutsuAdapter.text("asiakirja.ilmoitus.ilmoitus_vaihe_suunnitelman_hyvaksymispaatosta_pitka");
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    const kappale1Key =
      this.kutsuAdapter.projektiTyyppi === ProjektiTyyppi.TOIMINNALLINEN
        ? "asiakirja.ilmoitus.kappale1_toiminnallinen"
        : "asiakirja.ilmoitus.kappale1";
    return [
      this.paragraphFromKey(kappale1Key),
      this.paragraphFromKey("asiakirja.ilmoitus.kappale_kuulutus_julkaistaan"),
      this.paragraphFromKey("asiakirja.ilmoitus.kappale_kuulutus_nahtavilla"),
      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.params.yhteystiedot)),
    ];
  }

  get kuulutusOsoite(): string {
    return this.kutsuAdapter.linkki_hyvaksymispaatos;
  }
}
