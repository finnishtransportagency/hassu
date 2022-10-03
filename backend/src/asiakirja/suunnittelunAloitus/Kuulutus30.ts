import { DBProjekti, NahtavillaoloVaiheJulkaisu, Velho } from "../../database/model/";
import { Kieli, KirjaamoOsoite, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { AsiakirjanMuoto } from "../asiakirjaService";
import { translate } from "../../util/localization";
import { formatList, KutsuAdapter } from "./KutsuAdapter";
import { formatProperNoun } from "../../../../common/util/formatProperNoun";
import { formatDate } from "../asiakirjaUtil";
import PDFStructureElement = PDFKit.PDFStructureElement;

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "KUULUTUS SUUNNITELMAN NÄHTÄVILLE ASETTAMISESTA",
  RUOTSI: "Kungörelse om framläggandet av planen",
};

type EiRataa = ProjektiTyyppi.TIE | ProjektiTyyppi.YLEINEN;
type EiTieta = ProjektiTyyppi.RATA | ProjektiTyyppi.YLEINEN;
const fileNameKeys: { TIE: Record<EiRataa, string>; RATA: Record<EiTieta, string> } = {
  TIE: { [ProjektiTyyppi.TIE]: "T414", [ProjektiTyyppi.YLEINEN]: "30YS" },
  RATA: { [ProjektiTyyppi.RATA]: "30R", [ProjektiTyyppi.YLEINEN]: "30YS" },
};

function createFileName(kieli: Kieli, asiakirjanMuoto: AsiakirjanMuoto, projektiTyyppi: ProjektiTyyppi): string {
  if (
    (asiakirjanMuoto === AsiakirjanMuoto.RATA && projektiTyyppi === ProjektiTyyppi.TIE) ||
    (asiakirjanMuoto === AsiakirjanMuoto.TIE && projektiTyyppi === ProjektiTyyppi.RATA)
  ) {
    throw new Error(`Asiakirjan tyyppi ja projektityyppi ristiriidassa!`);
  }
  // tsekattu edellä
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const key: string = fileNameKeys[asiakirjanMuoto][projektiTyyppi];
  if (!key) {
    throw new Error("Unsupported operation");
  }
  const language = kieli == Kieli.SAAME ? Kieli.SUOMI : kieli;
  const kaannos: string = translate("tiedostonimi." + key, language) || "";
  if (!kaannos) {
    throw new Error(`Käännos puuttuu tiedostonimi.${key}:lle!`);
  }
  return kaannos;
}

export class Kuulutus30 extends CommonPdf {
  private readonly asiakirjanMuoto: AsiakirjanMuoto;
  // private readonly oid: string;
  private readonly nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu;
  // private readonly kayttoOikeudet: DBVaylaUser[];
  protected header: string;
  protected kieli: Kieli;
  private velho: Velho;
  private kirjaamoOsoitteet: KirjaamoOsoite[];

  constructor(
    projekti: DBProjekti,
    nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu,
    kieli: Kieli,
    asiakirjanMuoto: AsiakirjanMuoto,
    kirjaamoOsoitteet: KirjaamoOsoite[]
  ) {
    const velho = projekti.velho;
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
    if (!projekti.kielitiedot) {
      throw new Error("projekti.kielitiedot ei ole määritelty");
    }
    if (!nahtavillaoloVaihe.kuulutusPaiva) {
      throw new Error("nahtavillaoloVaihe.kuulutusPaiva ei ole määritelty");
    }
    if (!nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva) {
      throw new Error("nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva ei ole määritelty");
    }
    const language = kieli == Kieli.SAAME ? Kieli.SUOMI : kieli;
    const kutsuAdapter = new KutsuAdapter({
      oid: projekti.oid,
      kielitiedot: projekti.kielitiedot,
      velho,
      kieli,
      asiakirjanMuoto,
      projektiTyyppi: velho.tyyppi,
      kayttoOikeudet: projekti.kayttoOikeudet,
    });
    const fileName = createFileName(kieli, asiakirjanMuoto, velho.tyyppi);
    super(kieli, kutsuAdapter);
    this.velho = velho;
    this.kieli = kieli;

    this.nahtavillaoloVaihe = nahtavillaoloVaihe;
    this.asiakirjanMuoto = asiakirjanMuoto;
    this.kirjaamoOsoitteet = kirjaamoOsoitteet;
    this.header = headers[language];
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName);
  }

  protected addContent(): void {
    const vaylaTilaaja = this.isVaylaTilaaja(this.velho);
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.logo(vaylaTilaaja),
      this.headerElement(this.header),
      ...this.addDocumentElements(),
    ].filter((element) => element);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected addDocumentElements(): PDFStructureElement[] {
    const hallintolaki62 = this.selectText([
      "Asianosaisten katsotaan saaneen tiedon suunnittelun käynnistymisestä ja tutkimusoikeudesta seitsemäntenä päivänä kuulutuksen julkaisusta (hallintolaki 62 a §). ",
      "RUOTSIKSI Asianosaisten katsotaan saaneen tiedon suunnittelun käynnistymisestä ja tutkimusoikeudesta seitsemäntenä päivänä kuulutuksen julkaisusta (hallintolaki 62 a §). ",
    ]);
    return [
      this.paragraph(this.startOfPlanningPhrase),
      this.localizedParagraph([
        `Kuulutus on julkaistu tietoverkossa ${this.tilaajaGenetiivi} verkkosivuilla ${this.kuulutusPaiva}. ${hallintolaki62}`,
        `RUOTSIKSI Kuulutus on julkaistu tietoverkossa ${this.tilaajaGenetiivi} verkkosivuilla ${this.kuulutusPaiva}. ${hallintolaki62}`,
      ]),
      this.pidetaanNahtavillaParagraph(),
      this.muistutuksetParagraph(),
      this.tietosuojaParagraph(),
      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElementsStandardoiduillaYhteystiedoilla(this.nahtavillaoloVaihe?.yhteystiedot, true)),
      this.kutsuja(),
    ].filter((elem) => elem);
  }

  private kutsuja() {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return this.paragraph(this.kutsuAdapter.tilaajaOrganisaatio);
    } else {
      const kaannos: string = translate("vaylavirasto", this.kieli) || "";
      if (!kaannos) {
        throw new Error("Käännös puuttuu vaylavirasto:lle!");
      }
      return this.paragraph(kaannos);
    }
  }

  private get startOfPlanningPhrase() {
    let organisaatiotText: string;
    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const organisaatiot: string[] = this.velho?.kunnat;
    const trimmattutOrganisaatiot = organisaatiot.map((organisaatio) => formatProperNoun(organisaatio));
    const viimeinenOrganisaatio = trimmattutOrganisaatiot.slice(-1);
    const muut = trimmattutOrganisaatiot.slice(0, -1);
    return formatList([...muut, ...viimeinenOrganisaatio], this.kieli);
  }

  protected get kuulutusPaiva(): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            `Suunnitelma pidetään yleisesti nähtävänä ${formatDate(this.nahtavillaoloVaihe.kuulutusPaiva)}-${formatDate(
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              this.nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva
            )} välisen ajan ${this.tilaajaGenetiivi} tietoverkossa `,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            `RUOTSIKSI Suunnitelma pidetään yleisesti nähtävänä ${formatDate(this.nahtavillaoloVaihe.kuulutusPaiva)}-${formatDate(
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
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
    return this.isVaylaTilaaja(this.velho) ? "https://www.vayla.fi/kuulutukset" : "https://www.ely-keskus.fi/kuulutukset";
  }

  private muistutuksetParagraph() {
    return this.paragraph(
      `Kiinteistön omistajilla ja muilla asianosaisilla sekä niillä, joiden asumiseen, työntekoon tai muihin oloihin suunnitelma saattaa vaikuttaa, on mahdollisuus muistutusten tekemiseen suunnitelmasta. Muistutukset on toimitettava ${this.kutsuAdapter.tilaajaOrganisaatiolle} ennen nähtävänäoloajan päättymistä (LjMTL 27 §) osoitteeseen ${this.kirjaamo}. Muistutukseen on liitettävä asian asianumero ${this.kutsuAdapter.asianumero}.`
    );
  }

  get kirjaamo(): string {
    const kirjaamoOsoite = this.kirjaamoOsoitteet
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .filter((osoite) => osoite.nimi == this.velho.suunnittelustaVastaavaViranomainen.toString())
      .pop();
    if (kirjaamoOsoite) {
      return kirjaamoOsoite.sahkoposti;
    }
    return "<kirjaamon " + this.velho.suunnittelustaVastaavaViranomainen + " osoitetta ei löydy>";
  }
}
