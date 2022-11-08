import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import {
  DBVaylaUser,
  Kielitiedot,
  LocalizedMap,
  SuunnitteluSopimusJulkaisu,
  UudelleenKuulutus,
  Velho,
  Yhteystieto,
} from "../../database/model";
import { CommonPdf } from "./commonPdf";
import { KutsuAdapter } from "./KutsuAdapter";
import { translate } from "../../util/localization";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { assertIsDefined } from "../../util/assertions";
import PDFStructureElement = PDFKit.PDFStructureElement;

export type IlmoitusAsiakirjaTyyppi = Extract<
  AsiakirjaTyyppi,
  | AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA
  | AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE
>;
export type IlmoitusParams = {
  asiakirjanMuoto: AsiakirjanMuoto;
  oid?: string;
  kieli: Kieli;
  velho: Velho;
  kielitiedot: Kielitiedot;
  hankkeenKuvaus: LocalizedMap<string>;
  kuulutusPaiva: string;
  yhteystiedot?: Yhteystieto[];
  suunnitteluSopimus?: SuunnitteluSopimusJulkaisu;
  uudelleenKuulutus?: UudelleenKuulutus;

  // kayttoOikeudet must be set if yhteysHenkilot is set
  yhteysHenkilot?: string[];
  kayttoOikeudet?: DBVaylaUser[];
};

export abstract class SuunnittelunAloitusPdf extends CommonPdf {
  protected header: string;
  protected params: IlmoitusParams;

  constructor(params: IlmoitusParams, header: string, asiakirjanMuoto: AsiakirjanMuoto, fileNameKey: string) {
    if (!params.velho.tyyppi) {
      throw new Error("params.velho.tyyppi puuttuu");
    }
    if (!params.hankkeenKuvaus) {
      throw new Error("params.hankkeenKuvaus puuttuu");
    }
    const kutsuAdapter = new KutsuAdapter({
      velho: params.velho,
      asiakirjanMuoto,
      kielitiedot: params.kielitiedot,
      kieli: params.kieli,
      projektiTyyppi: params.velho.tyyppi,
      kayttoOikeudet: params.kayttoOikeudet,
      suunnitteluSopimus: params.suunnitteluSopimus,
    });
    super(params.kieli, kutsuAdapter);
    const kaannos: string = translate("tiedostonimi." + fileNameKey, params.kieli) || "";
    if (!kaannos) {
      throw new Error(`Käännos puutuu tiedostonimi.${fileNameKey}:lle`);
    }
    super.setupPDF(header, kutsuAdapter.nimi, kaannos);
    this.header = header;
    this.params = params;
  }

  protected addContent(): void {
    const elements: (PDFKit.PDFStructureElementChild | undefined)[] = [
      this.logo(this.isVaylaTilaaja(this.params.velho)),
      this.headerElement(this.header),
      this.titleElement(),
      this.uudelleenKuulutusParagraph(),
      ...this.addDocumentElements(),
    ].filter((p) => p);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    throw new Error("Method 'addDocumentElements()' must be implemented.");
  }

  protected get projektiTyyppi(): string {
    let tyyppi = "";
    switch (this.params.velho.tyyppi) {
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

  protected get kuulutusPaiva(): string {
    return this.params.kuulutusPaiva ? new Date(this.params.kuulutusPaiva).toLocaleDateString("fi") : "DD.MM.YYYY";
  }

  protected get tilaajaGenetiivi(): string {
    return this.kutsuAdapter.tilaajaGenetiivi;
  }

  protected hankkeenKuvaus(): PDFStructureElement {
    assertIsDefined(this.params.hankkeenKuvaus);
    return this.localizedParagraphFromMap(this.params.hankkeenKuvaus);
  }

  protected uudelleenKuulutusParagraph(): PDFStructureElement | undefined {
    if (this.params.uudelleenKuulutus?.selosteKuulutukselle) {
      return this.localizedParagraphFromMap(this.params.uudelleenKuulutus?.selosteKuulutukselle);
    }
  }
}
