import { CommonKutsuAdapter, CommonKutsuAdapterProps } from "./commonKutsuAdapter";
import { KirjaamoOsoite, KuulutusTekstit, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { formatDate } from "../asiakirjaUtil";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { DBVaylaUser, IlmoituksenVastaanottajat, NahtavillaoloVaiheJulkaisu, UudelleenKuulutus } from "../../database/model";
import { assertIsDefined } from "../../util/assertions";
import { kirjaamoOsoitteetService } from "../../kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { KaannettavaKieli } from "../../../../common/kaannettavatKielet";

export async function createNahtavillaoloVaiheKutsuAdapterProps(
  oid: string,
  lyhytOsoite: string | undefined | null,
  kayttoOikeudet: DBVaylaUser[],
  julkaisu: NahtavillaoloVaiheJulkaisu,
  kieli: KaannettavaKieli
): Promise<NahtavillaoloVaiheKutsuAdapterProps> {
  assertIsDefined(julkaisu);
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
    velho: julkaisu.velho,
    hankkeenKuvaus: julkaisu.hankkeenKuvaus,
    kirjaamoOsoitteet,
    uudelleenKuulutus: julkaisu.uudelleenKuulutus || undefined,
  };
}

export interface NahtavillaoloVaiheKutsuAdapterProps extends CommonKutsuAdapterProps {
  kuulutusPaiva: string;
  kuulutusVaihePaattyyPaiva?: string;
  kirjaamoOsoitteet: KirjaamoOsoite[];
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
}

export class NahtavillaoloVaiheKutsuAdapter extends CommonKutsuAdapter {
  readonly ilmoituksenVastaanottajat: IlmoituksenVastaanottajat | null | undefined;
  props: NahtavillaoloVaiheKutsuAdapterProps;

  constructor(props: NahtavillaoloVaiheKutsuAdapterProps) {
    super(props, "asiakirja.kuulutus_nahtavillaolosta.");
    const { ilmoituksenVastaanottajat } = props;
    this.ilmoituksenVastaanottajat = ilmoituksenVastaanottajat;
    this.props = props;
  }

  get subject(): string {
    return this.text("otsikko");
  }

  get kuulutusNahtavillaAika(): string {
    return this.formatDateRange(this.props.kuulutusPaiva, this.props.kuulutusVaihePaattyyPaiva);
  }

  get uudelleenKuulutusSeloste(): string | undefined {
    if (this.props.uudelleenKuulutus?.selosteLahetekirjeeseen) {
      return this.props?.uudelleenKuulutus?.selosteLahetekirjeeseen[this.kieli];
    }
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
      kuvausTekstit: [this.htmlText("kappale2"), this.htmlText("kappale3")],
      infoTekstit: [this.htmlText("kappale4")],
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
