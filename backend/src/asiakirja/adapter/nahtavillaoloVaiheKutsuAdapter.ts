import { CommonKutsuAdapter, CommonKutsuAdapterProps } from "./commonKutsuAdapter";
import { KirjaamoOsoite, KuulutusTekstit, ProjektiTyyppi } from "hassu-common/graphql/apiModel";
import { formatDate } from "../asiakirjaUtil";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import {
  DBProjekti,
  IlmoituksenVastaanottajat,
  NahtavillaoloVaiheJulkaisu,
  SuunnitteluSopimus,
  UudelleenKuulutus,
  Yhteystieto,
} from "../../database/model";
import { assertIsDefined } from "../../util/assertions";
import { kirjaamoOsoitteetService } from "../../kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { kuntametadata } from "hassu-common/kuntametadata";
import { organisaatioIsEly } from "../../util/organisaatioIsEly";
import { formatNimi } from "../../util/userUtil";
import { translate } from "../../util/localization";

export async function createNahtavillaoloVaiheKutsuAdapterProps(
  projekti: Pick<
    DBProjekti,
    "oid" | "lyhytOsoite" | "kayttoOikeudet" | "suunnitteluSopimus" | "euRahoitusLogot" | "vahainenMenettely" | "velho"
  >,
  julkaisu: NahtavillaoloVaiheJulkaisu,
  kieli: KaannettavaKieli
): Promise<NahtavillaoloVaiheKutsuAdapterProps> {
  const { kayttoOikeudet, oid, euRahoitusLogot, lyhytOsoite, suunnitteluSopimus, vahainenMenettely, velho } = projekti;

  assertIsDefined(julkaisu);
  assertIsDefined(velho);
  assertIsDefined(julkaisu.kuulutusVaihePaattyyPaiva);
  assertIsDefined(julkaisu.hankkeenKuvaus);
  assertIsDefined(julkaisu.kuulutusPaiva, "NahtavillaoloVaiheJulkaisu.kuulutusPaiva puuttuu");

  const kirjaamoOsoitteet = await kirjaamoOsoitteetService.listKirjaamoOsoitteet();
  return {
    oid,
    lyhytOsoite: lyhytOsoite || undefined,
    kayttoOikeudet,
    kieli,
    kielitiedot: julkaisu.kielitiedot,
    kuulutusPaiva: julkaisu.kuulutusPaiva,
    kuulutusVaihePaattyyPaiva: julkaisu.kuulutusVaihePaattyyPaiva,
    velho,
    hankkeenKuvaus: julkaisu.hankkeenKuvaus,
    kirjaamoOsoitteet,
    uudelleenKuulutus: julkaisu.uudelleenKuulutus || undefined,
    suunnitteluSopimus,
    euRahoitusLogot,
    yhteystiedot: julkaisu.yhteystiedot,
    vahainenMenettely,
  };
}

export interface NahtavillaoloVaiheKutsuAdapterProps extends CommonKutsuAdapterProps {
  kuulutusPaiva: string;
  kuulutusVaihePaattyyPaiva?: string;
  kirjaamoOsoitteet: KirjaamoOsoite[];
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  suunnitteluSopimus?: SuunnitteluSopimus | null;
  yhteystiedot?: Yhteystieto[];
}

export class NahtavillaoloVaiheKutsuAdapter extends CommonKutsuAdapter {
  readonly ilmoituksenVastaanottajat: IlmoituksenVastaanottajat | null | undefined;
  readonly vahainenMenettely: boolean | null | undefined;
  props: NahtavillaoloVaiheKutsuAdapterProps;

  constructor(props: NahtavillaoloVaiheKutsuAdapterProps) {
    super(props, "asiakirja.kuulutus_nahtavillaolosta.");
    const { ilmoituksenVastaanottajat, vahainenMenettely } = props;
    this.ilmoituksenVastaanottajat = ilmoituksenVastaanottajat;
    this.vahainenMenettely = vahainenMenettely;
    this.props = props;
  }

  get yhteystiedotNahtavillaolo(): string | undefined {
    return this.props?.yhteystiedot
      ?.map((y) => {
        let organisaatio = y.organisaatio;
        if (y.kunta) {
          organisaatio = kuntametadata.nameForKuntaId(y.kunta, this.kieli);
        } else if (organisaatioIsEly(y.organisaatio) && y.elyOrganisaatio) {
          const kaannos = translate(`viranomainen.${y.elyOrganisaatio}`, this.kieli);
          if (kaannos) {
            organisaatio = kaannos;
          }
        }
        return `${organisaatio ? organisaatio + ", " : ""}${formatNimi(y)}, puh. ${y.puhelinnumero}, ${y.sahkoposti}`;
      })
      .join("\n");
  }

  get subject(): string {
    return this.text("otsikko");
  }

  get kuulutusNahtavillaAika(): string {
    return this.formatDateRange(this.props.kuulutusPaiva, this.props.kuulutusVaihePaattyyPaiva);
  }

  get uudelleenKuulutusSeloste(): string | undefined {
    return this.props?.uudelleenKuulutus?.selosteLahetekirjeeseen?.[this.kieli];
  }
  get kuulutusPaiva(): string {
    return this.props.kuulutusPaiva ? formatDate(this.props.kuulutusPaiva) : "DD.MM.YYYY";
  }

  get kuulutusVaihePaattyyPaiva(): string {
    return this.props.kuulutusVaihePaattyyPaiva ? formatDate(this.props.kuulutusVaihePaattyyPaiva) : "DD.MM.YYYY";
  }

  get lakiviite(): string {
    return this.text(this.projektiTyyppi == ProjektiTyyppi.RATA ? "lakiviite_ilmoitus_rata" : "lakiviite_ilmoitus_tie");
  }

  get lakiviite_vahainen_menettely(): string {
    return this.text(this.projektiTyyppi == ProjektiTyyppi.RATA ? "lakiviite_vahainen_menettely_rata" : "lakiviite_vahainen_menettely_tie");
  }

  get kirjaamo(): string {
    const kirjaamoOsoite = this.props.kirjaamoOsoitteet
      .filter((osoite) => osoite.nimi == this.velho.suunnittelustaVastaavaViranomainen?.toString())
      .pop();
    if (kirjaamoOsoite) {
      return kirjaamoOsoite.sahkoposti;
    }
    return "<kirjaamon " + this.velho.suunnittelustaVastaavaViranomainen + " osoitetta ei löydy>";
  }

  get userInterfaceFields(): KuulutusTekstit {
    let kappale1;

    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      kappale1 = this.htmlText("rata_kappale1");
    } else {
      kappale1 = this.htmlText("tie_kappale1");
    }
    return {
      __typename: "KuulutusTekstit",
      leipaTekstit: [kappale1],
      kuvausTekstit: [this.htmlText("kappale2"), this.htmlText("kappale3_ui")],
      infoTekstit: this.vahainenMenettely ? [this.htmlText("kappale4_vahainen_menettely")] : [this.htmlText("kappale4")],
      tietosuoja: this.htmlText("asiakirja.tietosuoja", { extLinks: true }),
    };
  }

  get laheteKirjeVastaanottajat(): string[] {
    const result: string[] = [];
    const kunnat = this.ilmoituksenVastaanottajat?.kunnat;
    const viranomaiset = this.ilmoituksenVastaanottajat?.viranomaiset;
    kunnat?.forEach(({ sahkoposti }) => {
      result.push(sahkoposti);
    });
    viranomaiset?.forEach(({ sahkoposti }) => {
      result.push(sahkoposti);
    });
    return result;
  }
}
