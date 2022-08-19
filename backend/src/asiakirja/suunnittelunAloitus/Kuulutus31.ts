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

const fileNameKeys: Record<AsiakirjanMuoto, Partial<Record<ProjektiTyyppi, string>>> = {
  TIE: { [ProjektiTyyppi.TIE]: "31T", [ProjektiTyyppi.YLEINEN]: "31YS" },
  RATA: { [ProjektiTyyppi.RATA]: "31R", [ProjektiTyyppi.YLEINEN]: "31YS" },
};

function createFileName(kieli: Kieli, asiakirjanMuoto: AsiakirjanMuoto, projektiTyyppi: ProjektiTyyppi) {
  const key = fileNameKeys[asiakirjanMuoto]?.[projektiTyyppi];
  if (!key) {
    throw new Error("Unsupported operation");
  }
  const language = kieli == Kieli.SAAME ? Kieli.SUOMI : kieli;
  return translate("tiedostonimi." + key, language);
}

export class Kuulutus31 extends CommonPdf {
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
    const language = kieli == Kieli.SAAME ? Kieli.SUOMI : kieli;
    this.header = headers[language];
    this.kieli = kieli;

    this.nahtavillaoloVaihe = nahtavillaoloVaihe;
    this.asiakirjanMuoto = asiakirjanMuoto;
    this.kirjaamoOsoitteet = kirjaamoOsoitteet;

    this.setupPDF(this.header, kutsuAdapter.nimi, fileName);
  }

  protected addContent(): void {
    const vaylaTilaaja = this.isVaylaTilaaja(this.velho);
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.logo(vaylaTilaaja),
      this.addHeader(),
      ...this.addDocumentElements(),
    ].filter((element) => element);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected addDocumentElements(): PDFStructureElement[] {
    return [
      this.paragraph(this.startOfPlanningPhrase),
      this.pidetaanNahtavillaParagraph(),
      this.lahetettyOmistajilleParagraph(),
      this.localizedParagraph([
        "Maanomistustietojen mukaan omistatte kiinteistön suunnitelma-alueella. Mikäli kiinteistönne on vuokrattu, toivomme, että tiedotatte suunnitelman nähtäville asettamisesta vuokralaisianne.",
        "RUOTSIKSI Maanomistustietojen mukaan omistatte kiinteistön suunnitelma-alueella. Mikäli kiinteistönne on vuokrattu, toivomme, että tiedotatte suunnitelman nähtäville asettamisesta vuokralaisianne.",
      ]),
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

  protected get kuulutusVaihePaattyyPaiva(): string {
    return formatDate(this.nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva);
  }

  protected get tilaajaGenetiivi(): string {
    return this.kutsuAdapter.tilaajaGenetiivi;
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
        this.doc.fillColor("black").text(" (LjMTL 27 §). ", { link: undefined, underline: false });
      },
      this.localizedParagraph([
        `Kiinteistön omistajilla ja muilla asianosaisilla on mahdollisuus muistutuksen tekemiseen suunnitelmasta. ` +
          `Muistutukset on toimitettava ${this.kutsuAdapter.tilaajaGenetiivi} kirjaamoon ${this.kirjaamo}` +
          `tai <postiosoite> ennen nähtävillä oloajan päättymistä. Muistutukseen on liitettävä asian asianumero ${this.kutsuAdapter.asianumero}`,
      ]),
    ]);
  }

  private get kuulutusOsoite() {
    return this.isVaylaTilaaja(this.velho)
      ? "https://www.vayla.fi/kuulutukset"
      : "https://www.ely-keskus.fi/kuulutukset";
  }

  private addHeader() {
    return this.headerElement(this.kutsuAdapter.title);
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

  private lahetettyOmistajilleParagraph() {
    if (this.velho.tyyppi == ProjektiTyyppi.YLEINEN) {
      return this.localizedParagraph([
        `Tämä ilmoitus on lähetetty kaikille niille kiinteistön omistajille ja haltijoille, joiden kiinteistön alueelle suunniteltu uusi tielinjaus sijoittuu (LjMTL 27 § 3 mom).`,
      ]);
    } else if (this.velho.tyyppi == ProjektiTyyppi.TIE) {
      return this.localizedParagraph([
        `Tämä ilmoitus on lähetetty kaikille niille kiinteistön omistajille ja haltijoille (LjMTL 27 § 3 mom):
\t- joiden kiinteistöltä suunnitelman mukaan lunastetaan aluetta,
\t- joiden kiinteistön alueelle muodostuu suoja- tai näkemäalue,
\t- joiden kiinteistön alueeseen perustetaan muu oikeus tai
\t- joiden kiinteistö rajoittuu tiealueeseen/rautatiealueeseen.
`,
      ]);
    } else {
      return this.localizedParagraph([
        `Tämä ilmoitus on lähetetty kaikille niille kiinteistön omistajille ja halti-joille (ratalaki 22 § 3 mom):
\t- joiden kiinteistöstä suunnitelman mukaan lunastetaan aluetta
\t- joiden kiinteistön alueelle muodostuu suoja- tai näkemäalue
\t- joiden kiinteistön alueeseen perustetaan muu oikeus (tieoikeus, laskuoja)
\t- joiden kiinteistö rajoittuu rautatiealueeseen/tiealueeseen
`,
      ]);
    }
  }
}
