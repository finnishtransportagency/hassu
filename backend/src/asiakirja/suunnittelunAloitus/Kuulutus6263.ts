import { HyvaksymisPaatosVaihe, KasittelynTila, Velho } from "../../database/model/";
import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { AsiakirjanMuoto } from "../asiakirjaService";
import { translate } from "../../util/localization";
import { KutsuAdapter } from "./KutsuAdapter";
import { IlmoitusParams } from "./suunnittelunAloitusPdf";
import { formatDate } from "../asiakirjaUtil";
import PDFStructureElement = PDFKit.PDFStructureElement;

const pdfTypeKeys: Record<AsiakirjaTyyppi6263, Record<AsiakirjanMuoto, Record<never, string>>> = {
  ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE: {
    TIE: { [ProjektiTyyppi.TIE]: "T431_3", [ProjektiTyyppi.YLEINEN]: "62YS" },
    RATA: { [ProjektiTyyppi.RATA]: "62R", [ProjektiTyyppi.YLEINEN]: "62YS" },
  },
  ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE: {
    TIE: { [ProjektiTyyppi.TIE]: "T431_4", [ProjektiTyyppi.YLEINEN]: "63YS" },
    RATA: { [ProjektiTyyppi.RATA]: "63R", [ProjektiTyyppi.YLEINEN]: "63YS" },
  },
};

function createFileName(kieli: Kieli, pdfType: string) {
  const language = kieli == Kieli.SAAME ? Kieli.SUOMI : kieli;
  return translate("tiedostonimi." + pdfType, language);
}

type AsiakirjaTyyppi6263 = Extract<
  AsiakirjaTyyppi,
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE
>;

// noinspection JSUnusedGlobalSymbols
export class Kuulutus6263 extends CommonPdf {
  private readonly asiakirjanMuoto: AsiakirjanMuoto;
  protected header: string;
  protected kieli: Kieli;
  private readonly velho: Velho;
  private readonly asiakirjaTyyppi: AsiakirjaTyyppi6263;
  private hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe;
  private kasittelynTila: KasittelynTila;

  // private kirjaamoOsoitteet: KirjaamoOsoite[];

  constructor(
    asiakirjaTyyppi: AsiakirjaTyyppi6263,
    asiakirjanMuoto: AsiakirjanMuoto,
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe,
    kasittelynTila: KasittelynTila,
    params: IlmoitusParams
  ) {
    const velho = params.velho;
    const kieli = params.kieli;
    const kutsuAdapter = new KutsuAdapter({
      kielitiedot: params.kielitiedot,
      velho,
      kieli,
      asiakirjanMuoto,
      projektiTyyppi: velho.tyyppi,
      kayttoOikeudet: params.kayttoOikeudet,
    });
    super(kieli, kutsuAdapter);

    this.velho = velho;
    this.asiakirjaTyyppi = asiakirjaTyyppi;
    this.asiakirjanMuoto = asiakirjanMuoto;
    this.hyvaksymisPaatosVaihe = hyvaksymisPaatosVaihe;
    this.kasittelynTila = kasittelynTila;

    this.kutsuAdapter.setTemplateResolver(this);

    const pdfType = pdfTypeKeys[asiakirjaTyyppi][asiakirjanMuoto]?.[velho.tyyppi];
    const fileName = createFileName(kieli, pdfType);
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      this.header =
        kutsuAdapter.text("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.hyvaksymispaatoksesta_ilmoittaminen") +
        " " +
        this.ilmoittamiskohde();
    } else {
      this.header = kutsuAdapter.title;
    }
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName);
  }

  ilmoittamiskohde(): string {
    if (this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE) {
      return this.kutsuAdapter.text("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.lausunnonantajille");
    } else {
      return this.kutsuAdapter.text("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.muistuttajille");
    }
  }

  pyydamme_valittamaan_ilmoituksen(): string {
    if (
      this.asiakirjanMuoto == AsiakirjanMuoto.RATA &&
      this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
    ) {
      return this.kutsuAdapter.text("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.pyydamme_valittamaan_ilmoituksen");
    } else {
      return "";
    }
  }

  hyvaksymis_pvm(): string {
    return formatDate(this.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm);
  }

  asianumero_traficom(): string {
    return this.kasittelynTila?.hyvaksymispaatos?.asianumero || "";
  }

  kuulutuspaiva(): string {
    return formatDate(this.hyvaksymisPaatosVaihe.kuulutusPaiva);
  }

  kuulutusvaihepaattyypaiva(): string {
    return formatDate(this.hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva);
  }

  kuulutusosoite(): string {
    return this.isVaylaTilaaja(this.velho)
      ? "https://www.vayla.fi/kuulutukset"
      : "https://www.ely-keskus.fi/kuulutukset";
  }

  protected addContent(): void {
    const vaylaTilaaja = this.isVaylaTilaaja(this.velho);
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.logo(vaylaTilaaja),
      this.headerElement(this.header),
      ...this.paragraphs(),
    ].filter((element) => element);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  ilmoituksen_vastaanottajille(): string {
    if (this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE) {
      return this.kutsuAdapter.text("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.lausunnonantajille");
    }
    return this.kutsuAdapter.text("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.muistutuksen_tehneille");
  }

  private paragraphs(): PDFStructureElement[] {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return [
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.tie_kappale1"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.tie_kappale2"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.tie_kappale3"),
        this.tietosuojaParagraph(),
        this.lisatietojaAntavatParagraph(),
        this.doc.struct(
          "P",
          {},
          this.moreInfoElements(
            this.hyvaksymisPaatosVaihe.kuulutusYhteystiedot,
            undefined,
            this.hyvaksymisPaatosVaihe.kuulutusYhteysHenkilot,
            true
          )
        ),
      ];
    } else if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return [
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.rata_kappale1"),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.rata_kappale2"),
        this.tietosuojaParagraph(),
        this.paragraphFromKey("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.henkilotiedot_poistettu"),
        this.lisatietojaAntavatParagraph(),
        this.doc.struct(
          "P",
          {},
          this.moreInfoElements(
            this.hyvaksymisPaatosVaihe.kuulutusYhteystiedot,
            undefined,
            this.hyvaksymisPaatosVaihe.kuulutusYhteysHenkilot,
            true
          )
        ),
      ];
    }

    return [];
  }
}
