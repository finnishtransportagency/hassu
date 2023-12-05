import { CommonKutsuAdapter, CommonKutsuAdapterProps } from "./commonKutsuAdapter";
import {
  AloitusKuulutusJulkaisu,
  DBVaylaUser,
  IlmoituksenVastaanottajat,
  LocalizedMap,
  SuunnitteluSopimus,
  SuunnitteluSopimusJulkaisu,
  UudelleenKuulutus,
  Yhteystieto,
} from "../../database/model";
import { LaskuriTyyppi } from "hassu-common/graphql/apiModel";
import { assertIsDefined } from "../../util/assertions";
import { kuntametadata } from "hassu-common/kuntametadata";
import { formatNimi } from "../../util/userUtil";
import { calculateEndDate } from "../../endDateCalculator/endDateCalculatorHandler";
import { organisaatioIsEly } from "../../util/organisaatioIsEly";
import { translate } from "../../util/localization";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { formatDate } from "../asiakirjaUtil";

export async function createKuulutusKutsuAdapterProps(
  oid: string,
  lyhytOsoite: string | undefined | null,
  kayttoOikeudet: DBVaylaUser[],
  kieli: KaannettavaKieli,
  aloitusKuulutusJulkaisu?: AloitusKuulutusJulkaisu,
  euRahoitusLogot?: LocalizedMap<string> | null,
  vahainenMenettely?: boolean | null
): Promise<KuulutusKutsuAdapterProps> {
  assertIsDefined(aloitusKuulutusJulkaisu);
  assertIsDefined(aloitusKuulutusJulkaisu.kuulutusPaiva, "aloitusKuulutusJulkaisu.kuulutusPaiva puuttuu");
  const kuulutusVaihePaattyyPaiva = await calculateEndDate({
    alkupaiva: aloitusKuulutusJulkaisu.kuulutusPaiva,
    tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA,
  });
  return {
    oid,
    lyhytOsoite,
    hankkeenKuvaus: aloitusKuulutusJulkaisu.hankkeenKuvaus,
    kieli,
    kielitiedot: aloitusKuulutusJulkaisu.kielitiedot,
    kuulutusPaiva: aloitusKuulutusJulkaisu.kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    velho: aloitusKuulutusJulkaisu.velho,
    yhteystiedot: aloitusKuulutusJulkaisu.yhteystiedot,
    suunnitteluSopimus: aloitusKuulutusJulkaisu.suunnitteluSopimus || undefined,
    kayttoOikeudet,
    uudelleenKuulutus: aloitusKuulutusJulkaisu.uudelleenKuulutus || undefined,
    euRahoitusLogot: euRahoitusLogot || undefined,
    vahainenMenettely,
  };
}

export interface KuulutusKutsuAdapterProps extends CommonKutsuAdapterProps {
  kuulutusPaiva: string;
  kuulutusVaihePaattyyPaiva?: string;
  suunnitteluSopimus?: SuunnitteluSopimus | SuunnitteluSopimusJulkaisu | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  yhteystiedot: Yhteystieto[];
}

export abstract class KuulutusKutsuAdapter<T extends KuulutusKutsuAdapterProps> extends CommonKutsuAdapter {
  readonly suunnitteluSopimus?: SuunnitteluSopimusJulkaisu | SuunnitteluSopimus | null;
  readonly ilmoituksenVastaanottajat: IlmoituksenVastaanottajat | null | undefined;
  readonly uudelleenKuulutus?: UudelleenKuulutus | null;
  readonly props: T;
  readonly vahainenMenettely: boolean | null | undefined;

  constructor(props: T, localizationKeyPrefix?: string) {
    super(props, localizationKeyPrefix);
    const { suunnitteluSopimus, ilmoituksenVastaanottajat, uudelleenKuulutus, vahainenMenettely } = props;
    this.suunnitteluSopimus = suunnitteluSopimus;
    this.ilmoituksenVastaanottajat = ilmoituksenVastaanottajat;
    this.uudelleenKuulutus = uudelleenKuulutus;
    this.vahainenMenettely = vahainenMenettely;
    this.props = props;
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

  get uudelleenKuulutusSeloste(): string | undefined {
    return this.uudelleenKuulutus?.selosteLahetekirjeeseen?.[this.kieli];
  }

  get kuulutusPaiva(): string {
    return this.props.kuulutusPaiva ? formatDate(this.props.kuulutusPaiva) : "DD.MM.YYYY";
  }

  get kuulutusNahtavillaAika(): string {
    return this.formatDateRange(this.props.kuulutusPaiva, this.props.kuulutusVaihePaattyyPaiva);
  }

  get simple_yhteystiedot(): string[] {
    return this.props.yhteystiedot.map((y) => {
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
    });
  }
}
