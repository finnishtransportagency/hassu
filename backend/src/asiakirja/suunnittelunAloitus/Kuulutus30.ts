import { DBProjekti, NahtavillaoloVaiheJulkaisu, Velho } from "../../database/model/";
import { Kieli, KirjaamoOsoite, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { AsiakirjanMuoto } from "../asiakirjaService";
import { translate } from "../../util/localization";
import { formatList, KutsuAdapter } from "./KutsuAdapter";
import { formatProperNoun } from "../../../../common/util/formatProperNoun";
import PDFStructureElement = PDFKit.PDFStructureElement;

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "KUULUTUS SUUNNITELMAN NÄHTÄVILLE ASETTAMISESTA",
  RUOTSI: "Kungörelse om framläggandet av planen",
};

const fileNameKeys: Record<AsiakirjanMuoto, Record<never, string>> = {
  TIE: { [ProjektiTyyppi.TIE]: "T414", [ProjektiTyyppi.YLEINEN]: "30YS" },
  RATA: { [ProjektiTyyppi.RATA]: "30R", [ProjektiTyyppi.YLEINEN]: "30YS" },
};

function createFileName(kieli: Kieli, asiakirjanMuoto: AsiakirjanMuoto, projektiTyyppi: ProjektiTyyppi) {
  const key = fileNameKeys[asiakirjanMuoto]?.[projektiTyyppi];
  if (!key) {
    throw new Error("Unsupported operation");
  }
  const language = kieli == Kieli.SAAME ? Kieli.SUOMI : kieli;
  return translate("tiedostonimi." + key, language);
}

function formatDate(date: string) {
  return date ? new Date(date).toLocaleDateString("fi") : "DD.MM.YYYY";
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
    super(headers[language], kieli, kutsuAdapter, fileName);
    this.velho = velho;
    this.kieli = kieli;

    this.nahtavillaoloVaihe = nahtavillaoloVaihe;
    this.asiakirjanMuoto = asiakirjanMuoto;
    this.kirjaamoOsoitteet = kirjaamoOsoitteet;
    this.header = headers[language];
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
      this.doc.struct(
        "P",
        {},
        this.moreInfoElements(
          this.nahtavillaoloVaihe.kuulutusYhteystiedot,
          undefined,
          this.nahtavillaoloVaihe.kuulutusYhteysHenkilot,
          true
        )
      ),
      this.kutsuja(),
    ].filter((elem) => elem);
  }

  private kutsuja() {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return this.paragraph(this.kutsuAdapter.tilaajaOrganisaatio);
    } else {
      return this.paragraph(translate("vaylavirasto", this.kieli));
    }
  }

  private get startOfPlanningPhrase() {
    let organisaatiotText: string;
    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      organisaatiotText = translate("info.nahtavillaolo.rata.on_laatinut", this.kieli);
    } else {
      organisaatiotText = translate("info.nahtavillaolo.ei-rata.on_laatinut", this.kieli);
    }
    return `${this.kutsuAdapter.tilaajaOrganisaatio} ${organisaatiotText} ${this.kutsuAdapter.suunnitelman} ${
      this.kutsuAdapter.nimi
    }, ${this.getKunnatString()}`;
  }

  private getKunnatString() {
    const organisaatiot = this.velho?.kunnat;
    const trimmattutOrganisaatiot = organisaatiot.map((organisaatio) => formatProperNoun(organisaatio));
    const viimeinenOrganisaatio = trimmattutOrganisaatiot.slice(-1);
    const muut = trimmattutOrganisaatiot.slice(0, -1);
    return formatList([...muut, ...viimeinenOrganisaatio], this.kieli);
  }

  protected get kuulutusPaiva(): string {
    return formatDate(this.nahtavillaoloVaihe?.kuulutusPaiva);
  }

  protected get tilaajaGenetiivi(): string {
    const tilaajaOrganisaatio = this.velho?.tilaajaOrganisaatio;
    if (tilaajaOrganisaatio === "Väylävirasto") {
      return tilaajaOrganisaatio ? "Väyläviraston" : "Tilaajaorganisaation";
    } else {
      return tilaajaOrganisaatio ? tilaajaOrganisaatio?.slice(0, -1) + "ksen" : "Tilaajaorganisaation";
    }
  }

  private pidetaanNahtavillaParagraph() {
    return this.doc.struct("P", {}, [
      () => {
        this.doc.text(
          this.selectText([
            `Suunnitelma pidetään yleisesti nähtävänä ${formatDate(this.nahtavillaoloVaihe.kuulutusPaiva)}-${formatDate(
              this.nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva
            )} välisen ajan ${this.tilaajaGenetiivi} tietoverkossa `,
            `RUOTSIKSI Suunnitelma pidetään yleisesti nähtävänä ${formatDate(
              this.nahtavillaoloVaihe.kuulutusPaiva
            )}-${formatDate(this.nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva)} välisen ajan ${
              this.tilaajaGenetiivi
            } tietoverkossa `,
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
    return this.isVaylaTilaaja(this.velho)
      ? "https://www.vayla.fi/kuulutukset"
      : "https://www.ely-keskus.fi/kuulutukset";
  }

  private muistutuksetParagraph() {
    return this.paragraph(
      `Kiinteistön omistajilla ja muilla asianosaisilla sekä niillä, joiden asumiseen, työntekoon tai muihin oloihin suunnitelma saattaa vaikuttaa, on mahdollisuus muistutusten tekemiseen suunnitelmasta. Muistutukset on toimitettava ${this.kutsuAdapter.tilaajaOrganisaatiolle} ennen nähtävänäoloajan päättymistä (LjMTL 27 §) osoitteeseen ${this.kirjaamo}. Muistutukseen on liitettävä asian asianumero ${this.kutsuAdapter.asianumero}.`
    );
  }

  private tietosuojaParagraph() {
    if (this.asiakirjanMuoto !== AsiakirjanMuoto.RATA) {
      return this.viranomainenTietosuojaParagraph(this.velho);
    } else {
      return this.vaylavirastoTietosuojaParagraph();
    }
  }

  get kirjaamo(): string {
    const kirjaamoOsoite = this.kirjaamoOsoitteet
      .filter((osoite) => osoite.nimi == this.velho.suunnittelustaVastaavaViranomainen.toString())
      .pop();
    if (kirjaamoOsoite) {
      return kirjaamoOsoite.sahkoposti;
    }
    return "<kirjaamon " + this.velho.suunnittelustaVastaavaViranomainen + " osoitetta ei löydy>";
  }
}
