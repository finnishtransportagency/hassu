import { HyvaksymisPaatosVaiheJulkaisu, KasittelynTila, Velho } from "../../database/model/";
import { Kieli, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { translate } from "../../util/localization";
import { formatList, KutsuAdapter } from "./KutsuAdapter";
import { IlmoitusParams } from "./suunnittelunAloitusPdf";
import { formatDate } from "../asiakirjaUtil";
import PDFStructureElement = PDFKit.PDFStructureElement;

const pdfTypeKeys: Record<AsiakirjanMuoto, Record<never, string>> = {
  TIE: { [ProjektiTyyppi.TIE]: "T431_1", [ProjektiTyyppi.YLEINEN]: "61YS" },
  RATA: { [ProjektiTyyppi.RATA]: "61R", [ProjektiTyyppi.YLEINEN]: "61YS" },
};

function createFileName(kieli: Kieli, pdfType: string): string {
  const language = kieli == Kieli.SAAME ? Kieli.SUOMI : kieli;
  const kaannos: string = translate("tiedostonimi." + pdfType, language) || "";
  if (!kaannos) {
    throw new Error(`Puuttu käännös tiedostonimi.${pdfType}:lle`);
  }
  return kaannos;
}

// noinspection JSUnusedGlobalSymbols
export class Kuulutus61 extends CommonPdf {
  private readonly asiakirjanMuoto: AsiakirjanMuoto;
  protected header: string;
  protected kieli: Kieli;
  private readonly velho: Velho;
  private hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  private kasittelynTila: KasittelynTila;

  // private kirjaamoOsoitteet: KirjaamoOsoite[];

  constructor(
    asiakirjanMuoto: AsiakirjanMuoto,
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu,
    kasittelynTila: KasittelynTila,
    params: IlmoitusParams
  ) {
    const velho = params.velho;
    const kieli = params.kieli;
    if (!velho.tyyppi) {
      throw new Error("velho.tyyppi ei ole määritelty");
    }
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
    const kutsuAdapter = new KutsuAdapter({
      oid: params.oid,
      kielitiedot: params.kielitiedot,
      velho,
      kieli,
      asiakirjanMuoto,
      projektiTyyppi: velho.tyyppi,
      kayttoOikeudet: params.kayttoOikeudet,
    });
    super(kieli, kutsuAdapter);
    this.kieli = kieli;
    this.velho = velho;
    this.asiakirjanMuoto = asiakirjanMuoto;
    this.hyvaksymisPaatosVaihe = hyvaksymisPaatosVaihe;
    this.kasittelynTila = kasittelynTila;

    this.kutsuAdapter.setTemplateResolver(this);
    if (
      (asiakirjanMuoto === AsiakirjanMuoto.RATA && velho.tyyppi === ProjektiTyyppi.TIE) ||
      (asiakirjanMuoto === AsiakirjanMuoto.TIE && velho.tyyppi === ProjektiTyyppi.RATA)
    ) {
      throw new Error(`Asiakirjan tyyppi ja projektityyppi ristiriidassa!`);
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const pdfType = pdfTypeKeys[asiakirjanMuoto][velho.tyyppi];
    const fileName = createFileName(kieli, pdfType);
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
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

  kuulutusvaihepaattyypaiva(): string {
    return formatDate(this.hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva);
  }

  hallinto_oikeus_genetiivi(): string {
    return this.kutsuAdapter.text("hallinto_oikeus_genetiivi." + this.hyvaksymisPaatosVaihe.hallintoOikeus);
  }

  kuulutusosoite(): string {
    return this.isVaylaTilaaja(this.velho) ? "https://www.vayla.fi/kuulutukset" : "https://www.ely-keskus.fi/kuulutukset";
  }

  protected addContent(): void {
    const vaylaTilaaja = this.isVaylaTilaaja(this.velho);
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.logo(vaylaTilaaja),
      ...this.paragraphs(),
      this.toimivaltainenViranomainen(),
    ].filter((element) => element);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  ilmoituksen_vastaanottajille(): string {
    return formatList(
      []
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .concat(this.hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat.kunnat.map((kunta) => kunta.nimi.trim()))
        .concat(
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat.viranomaiset.map((viranomainen) =>
            this.kutsuAdapter.text("viranomainen." + viranomainen.nimi)
          )
        ),
      this.kieli
    );
  }

  private paragraphs(): PDFStructureElement[] {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return [
        this.headerElement(this.header, false),
        this.headerElement(this.kutsuAdapter.title, false),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.hyvaksymispaatoksesta_ilmoittaminen"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.tie_kappale1"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.toimivaltaisen_viranomaisen_kuulutuksesta_ilmoittaminen"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.tie_kappale2"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.tie_kappale3"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.pyytaa_kuntia"),
        this.tietosuojaParagraph(),
        this.lisatietojaAntavatParagraph(),
        this.doc.struct(
          "P",
          {},
          this.moreInfoElements(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.hyvaksymisPaatosVaihe.yhteystiedot,
            undefined,
            null,
            true
          )
        ),
      ];
    } else if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return [
        this.headerElement(this.kutsuAdapter.title, false),
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
        this.doc.struct("P", {}, this.moreInfoElements(this.hyvaksymisPaatosVaihe.yhteystiedot, undefined, null, true)),
      ];
    }

    return [];
  }

  private toimivaltainenViranomainen() {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
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
