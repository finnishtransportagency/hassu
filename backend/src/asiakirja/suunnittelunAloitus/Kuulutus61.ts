import { HyvaksymisPaatosVaiheJulkaisu, KasittelynTila } from "../../database/model/";
import { AsiakirjaTyyppi } from "../../../../common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { translate } from "../../util/localization";
import { formatDate } from "../asiakirjaUtil";
import { kuntametadata } from "../../../../common/kuntametadata";
import { createPDFFileName } from "../pdfFileName";
import { HyvaksymisPaatosVaiheKutsuAdapter, HyvaksymisPaatosVaiheKutsuAdapterProps } from "../adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import { formatList } from "../adapter/commonKutsuAdapter";
import PDFStructureElement = PDFKit.PDFStructureElement;

// noinspection JSUnusedGlobalSymbols
export class Kuulutus61 extends CommonPdf<HyvaksymisPaatosVaiheKutsuAdapter> {
  protected header: string;
  private hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  private kasittelynTila: KasittelynTila;

  constructor(
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu,
    kasittelynTila: KasittelynTila,
    props: HyvaksymisPaatosVaiheKutsuAdapterProps
  ) {
    const velho = props.velho;
    const kieli = props.kieli;
    if (!velho.kunnat) {
      throw new Error("velho.kunnat ei ole määritelty");
    }
    if (!velho.suunnittelustaVastaavaViranomainen) {
      throw new Error("velho.suunnittelustaVastaavaViranomainen ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe) {
      throw new Error("hyvaksymisPaatosVaihe ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat) {
      throw new Error("hyvaksymisPaatosVaihe.ilmoituksenVastanottajat ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat.kunnat) {
      throw new Error("hyvaksymisPaatosVaihe.ilmoituksenVastanottajat.kunnat ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat.viranomaiset) {
      throw new Error("hyvaksymisPaatosVaihe.ilmoituksenVastanottajat.viranomaiset ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe.kuulutusPaiva) {
      throw new Error("hyvaksymisPaatosVaihe.kuulutusPaiva ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe.hallintoOikeus) {
      throw new Error("hyvaksymisPaatosVaihe.hallintoOikeus ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva) {
      throw new Error("hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva ei ole määritelty");
    }
    if (!kasittelynTila) {
      throw new Error("kasittelynTila ei ole määritelty");
    }
    if (!kasittelynTila.hyvaksymispaatos) {
      throw new Error("kasittelynTila.hyvaksymispaatos ei ole määritelty");
    }
    if (!kasittelynTila.hyvaksymispaatos.paatoksenPvm) {
      throw new Error("kasittelynTila.hyvaksymispaatos.paatoksenPvm ei ole määritelty");
    }
    const kutsuAdapter = new HyvaksymisPaatosVaiheKutsuAdapter(props);
    super(kieli, kutsuAdapter);
    this.hyvaksymisPaatosVaihe = hyvaksymisPaatosVaihe;
    this.kasittelynTila = kasittelynTila;

    this.kutsuAdapter.addTemplateResolver(this);
    const fileName = createPDFFileName(
      AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE,
      this.kutsuAdapter.asiakirjanMuoto,
      velho.tyyppi,
      kieli
    );
    if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      this.header = kutsuAdapter.text("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.hyvaksymispaatoksesta_ilmoittaminen");
    } else {
      this.header = kutsuAdapter.nimi;
    }

    super.setupPDF(this.header, kutsuAdapter.nimi, fileName);
  }

  hyvaksymis_pvm(): string {
    return formatDate(this.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm);
  }

  asianumero_traficom(): string {
    return this.kasittelynTila?.hyvaksymispaatos?.asianumero || "";
  }

  kuulutuspaiva(): string {
    return formatDate(this.hyvaksymisPaatosVaihe?.kuulutusPaiva);
  }

  protected uudelleenKuulutusParagraph(): PDFStructureElement | undefined {
    if (this.hyvaksymisPaatosVaihe.uudelleenKuulutus?.selosteKuulutukselle) {
      return this.localizedParagraphFromMap(this.hyvaksymisPaatosVaihe.uudelleenKuulutus?.selosteKuulutukselle);
    }
  }

  kuulutusvaihepaattyypaiva(): string {
    return formatDate(this.hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva);
  }

  hallinto_oikeus_genetiivi(): string {
    return this.kutsuAdapter.text("hallinto_oikeus_genetiivi." + this.hyvaksymisPaatosVaihe.hallintoOikeus);
  }

  kuulutusosoite(): string {
    return this.isVaylaTilaaja() ? "https://www.vayla.fi/kuulutukset" : "https://www.ely-keskus.fi/kuulutukset";
  }

  protected addContent(): void {
    const vaylaTilaaja = this.isVaylaTilaaja();
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.logo(vaylaTilaaja),
      ...this.paragraphs(),
      this.toimivaltainenViranomainen(),
    ].filter((element) => element);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  ilmoituksen_vastaanottajille(): string {
    return formatList(
      ([] as string[])
        .concat(
          kuntametadata.namesForKuntaIds(
            this.hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat?.kunnat?.map((kunta) => kunta.id),
            this.kieli
          )
        )
        .concat(
          this.hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) =>
            this.kutsuAdapter.text("viranomainen." + viranomainen.nimi)
          ) || []
        ),
      this.kieli
    );
  }

  private paragraphs(): PDFStructureElement[] {
    if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return [
        this.headerElement(this.header, false),
        this.headerElement(this.kutsuAdapter.title, false),
        this.uudelleenKuulutusParagraph(),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.hyvaksymispaatoksesta_ilmoittaminen"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.tie_kappale1"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.toimivaltaisen_viranomaisen_kuulutuksesta_ilmoittaminen"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.tie_kappale2"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.tie_kappale3"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.pyytaa_kuntia"),
        this.tietosuojaParagraph(),
        this.lisatietojaAntavatParagraph(),
        this.doc.struct("P", {}, this.moreInfoElements(this.hyvaksymisPaatosVaihe.yhteystiedot, null, true)),
      ].filter((elem): elem is PDFStructureElement => !!elem);
    } else if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return [
        this.headerElement(this.kutsuAdapter.title, false),
        this.uudelleenKuulutusParagraph(),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.hyvaksymispaatoksesta_ilmoittaminen"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.rata_kunnille_elylle_kappale1"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.rata_kunnille_elylle_kappale2"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.henkilotiedot_poistettu"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.vaylaviraston_kuulutuksesta_ilmoittaminen"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.rata_kunnille_elylle_kappale3"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.rata_kunnille_elylle_kappale4"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.rata_kunnille_elylle_kappale5"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.rata_kunnille_elylle_kappale6"),
        this.tietosuojaParagraph(),
        this.lisatietojaAntavatParagraph(),
        this.doc.struct("P", {}, this.moreInfoElements(this.hyvaksymisPaatosVaihe.yhteystiedot, null, true)),
      ].filter((elem): elem is PDFStructureElement => !!elem);
    }

    return [];
  }

  private toimivaltainenViranomainen() {
    if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return this.paragraph(this.kutsuAdapter.tilaajaOrganisaatio);
    } else {
      const kaannos = translate("vaylavirasto", this.kieli) || "";
      if (!kaannos) {
        throw new Error("Puuttuu käännös sanalta vaylavirasto");
      }
      return this.paragraph(kaannos);
    }
  }
}
