import { NahtavillaoloVaiheJulkaisu, Velho } from "../../database/model/";
import { AsiakirjaTyyppi, Kieli, KirjaamoOsoite } from "../../../../common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { translate } from "../../util/localization";
import { formatProperNoun } from "../../../../common/util/formatProperNoun";
import { formatDate } from "../asiakirjaUtil";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { kuntametadata } from "../../../../common/kuntametadata";
import { createPDFFileName } from "../pdfFileName";
import { NahtavillaoloVaiheKutsuAdapter, NahtavillaoloVaiheKutsuAdapterProps } from "../adapter/nahtavillaoloVaiheKutsuAdapter";
import { formatList } from "../adapter/commonKutsuAdapter";
import PDFStructureElement = PDFKit.PDFStructureElement;

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "KUULUTUS SUUNNITELMAN NÄHTÄVILLE ASETTAMISESTA",
  RUOTSI: "Kungörelse om framläggandet av planen",
};

export class Kuulutus30 extends CommonPdf<NahtavillaoloVaiheKutsuAdapter> {
  private readonly nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu;
  protected header: string;
  protected kieli: Kieli;
  private readonly velho: Velho;
  private kirjaamoOsoitteet: KirjaamoOsoite[];

  constructor(
    params: NahtavillaoloVaiheKutsuAdapterProps,
    nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu,
    kirjaamoOsoitteet: KirjaamoOsoite[]
  ) {
    const velho = params.velho;
    if (!velho) {
      throw new Error("projekti.velho ei ole määritelty");
    }
    if (!velho.tyyppi) {
      throw new Error("velho.tyyppi ei ole määritelty");
    }
    if (!velho.kunnat) {
      throw new Error("velho.kunnat ei ole määritelty");
    }
    if (!velho.suunnittelustaVastaavaViranomainen) {
      throw new Error("velho.suunnittelustaVastaavaViranomainen ei ole määritelty");
    }
    if (!params.kielitiedot) {
      throw new Error("params.kielitiedot ei ole määritelty");
    }
    if (!nahtavillaoloVaihe.kuulutusPaiva) {
      throw new Error("nahtavillaoloVaihe.kuulutusPaiva ei ole määritelty");
    }
    if (!nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva) {
      throw new Error("nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva ei ole määritelty");
    }
    const language = params.kieli == Kieli.SAAME ? Kieli.SUOMI : params.kieli;
    const kutsuAdapter = new NahtavillaoloVaiheKutsuAdapter({
      oid: params.oid,
      kielitiedot: params.kielitiedot,
      velho,
      kieli: params.kieli,
      kayttoOikeudet: params.kayttoOikeudet,
    });
    const fileName = createPDFFileName(AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS, kutsuAdapter.asiakirjanMuoto, velho.tyyppi, params.kieli);
    super(params.kieli, kutsuAdapter);
    this.velho = velho;
    this.kieli = params.kieli;

    this.nahtavillaoloVaihe = nahtavillaoloVaihe;
    this.kirjaamoOsoitteet = kirjaamoOsoitteet;
    this.header = headers[language];
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName);
  }

  protected addContent(): void {
    const elements: PDFKit.PDFStructureElementChild[] = [this.headerElement(this.header), ...this.addDocumentElements()].filter(
      (element) => element
    );
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected addDocumentElements(): PDFStructureElement[] {
    const hallintolaki62 = this.selectText([
      "Asianosaisten katsotaan saaneen tiedon suunnittelun käynnistymisestä ja tutkimusoikeudesta seitsemäntenä päivänä kuulutuksen julkaisusta (hallintolaki 62 a §). ",
      "RUOTSIKSI Asianosaisten katsotaan saaneen tiedon suunnittelun käynnistymisestä ja tutkimusoikeudesta seitsemäntenä päivänä kuulutuksen julkaisusta (hallintolaki 62 a §). ",
    ]);
    return [
      this.uudelleenKuulutusParagraph(),
      this.paragraph(this.startOfPlanningPhrase),
      this.localizedParagraph([
        `Kuulutus on julkaistu tietoverkossa ${this.tilaajaGenetiivi} verkkosivuilla ${this.kuulutusPaiva}. ${hallintolaki62}`,
        `RUOTSIKSI Kuulutus on julkaistu tietoverkossa ${this.tilaajaGenetiivi} verkkosivuilla ${this.kuulutusPaiva}. ${hallintolaki62}`,
      ]),

      this.pidetaanNahtavillaParagraph(),
      this.muistutuksetParagraph(),
      this.tietosuojaParagraph(),
      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.nahtavillaoloVaihe?.yhteystiedot, null, true)),
      this.paragraph(this.kutsuAdapter.kutsuja() || ""),
    ].filter((elem): elem is PDFStructureElement => !!elem);
  }

  private get startOfPlanningPhrase() {
    let organisaatiotText: string;
    if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      organisaatiotText = translate("info.nahtavillaolo.rata.on_laatinut", this.kieli) || "";
      if (!organisaatiotText) {
        throw new Error("Käännös puuttuu info.nahtavillaolo.rata.on_laatinut:lle!");
      }
    } else {
      organisaatiotText = translate("info.nahtavillaolo.ei-rata.on_laatinut", this.kieli) || "";
      if (!organisaatiotText) {
        throw new Error("Käännös puuttuu info.nahtavillaolo.ei-rata.on_laatinut:lle!");
      }
    }
    return `${this.kutsuAdapter.tilaajaOrganisaatio} ${organisaatiotText} ${this.kutsuAdapter.suunnitelman} ${
      this.kutsuAdapter.nimi
    }, ${this.getKunnatString()}`;
  }

  private getKunnatString() {
    const organisaatiot: string[] | undefined = this.velho?.kunnat?.map((kuntaId) => kuntametadata.nameForKuntaId(kuntaId, this.kieli));
    if (organisaatiot) {
      const trimmattutOrganisaatiot = organisaatiot.map((organisaatio) => formatProperNoun(organisaatio));
      const viimeinenOrganisaatio = trimmattutOrganisaatiot.slice(-1);
      const muut = trimmattutOrganisaatiot.slice(0, -1);
      return formatList([...muut, ...viimeinenOrganisaatio], this.kieli);
    }
  }

  protected get kuulutusPaiva(): string {
    return formatDate(this.nahtavillaoloVaihe?.kuulutusPaiva);
  }

  protected get tilaajaGenetiivi(): string {
    return this.kutsuAdapter.tilaajaGenetiivi;
  }

  private pidetaanNahtavillaParagraph() {
    if (!(this.nahtavillaoloVaihe.kuulutusPaiva && this.nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva)) {
      throw new Error(
        "Projektilta puuttuu tietoja: this.nahtavillaoloVaihe.kuulutusPaiva tai this.nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva"
      );
    }
    return this.doc.struct("P", {}, [
      () => {
        this.doc.text(
          this.selectText([
            `Suunnitelma pidetään yleisesti nähtävänä ${formatDate(this.nahtavillaoloVaihe.kuulutusPaiva)}-${formatDate(
              this.nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva
            )} välisen ajan ${this.tilaajaGenetiivi} tietoverkossa `,
            `RUOTSIKSI Suunnitelma pidetään yleisesti nähtävänä ${formatDate(this.nahtavillaoloVaihe.kuulutusPaiva)}-${formatDate(
              this.nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva
            )} välisen ajan ${this.tilaajaGenetiivi} tietoverkossa `,
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
        this.doc.fillColor("black").text(" (LjMTL 27 §). ", { link: undefined, underline: false }).moveDown();
      },
    ]);
  }

  private get kuulutusOsoite() {
    return this.isVaylaTilaaja() ? "https://www.vayla.fi/kuulutukset" : "https://www.ely-keskus.fi/kuulutukset";
  }

  private muistutuksetParagraph() {
    return this.paragraph(
      `Kiinteistön omistajilla ja muilla asianosaisilla sekä niillä, joiden asumiseen, työntekoon tai muihin oloihin suunnitelma saattaa vaikuttaa, on mahdollisuus muistutusten tekemiseen suunnitelmasta. Muistutukset on toimitettava ${this.kutsuAdapter.tilaajaOrganisaatiolle} ennen nähtävänäoloajan päättymistä (LjMTL 27 §) osoitteeseen ${this.kirjaamo}. Muistutukseen on liitettävä asian asianumero ${this.kutsuAdapter.asiatunnus}.`
    );
  }

  protected uudelleenKuulutusParagraph(): PDFStructureElement | undefined {
    if (this.nahtavillaoloVaihe.uudelleenKuulutus?.selosteKuulutukselle) {
      return this.localizedParagraphFromMap(this.nahtavillaoloVaihe.uudelleenKuulutus?.selosteKuulutukselle);
    }
  }

  get kirjaamo(): string {
    const kirjaamoOsoite = this.kirjaamoOsoitteet
      .filter((osoite) => osoite.nimi == this.velho.suunnittelustaVastaavaViranomainen?.toString())
      .pop();
    if (kirjaamoOsoite) {
      return kirjaamoOsoite.sahkoposti;
    }
    return "<kirjaamon " + this.velho.suunnittelustaVastaavaViranomainen + " osoitetta ei löydy>";
  }
}
