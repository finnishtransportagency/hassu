import { CommonKutsuAdapter, CommonKutsuAdapterProps } from "./commonKutsuAdapter";
import { IlmoituksenVastaanottajat, UudelleenKuulutus, Yhteystieto } from "../../database/model";
import { kuntametadata } from "hassu-common/kuntametadata";
import { formatNimi } from "../../util/userUtil";
import { organisaatioIsEly } from "../../util/organisaatioIsEly";
import { translate } from "../../util/localization";
import { formatDate } from "../asiakirjaUtil";
import { Kieli } from "hassu-common/graphql/apiModel";

export interface KuulutusKutsuAdapterProps extends CommonKutsuAdapterProps {
  kuulutusPaiva: string;
  kuulutusVaihePaattyyPaiva?: string;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  yhteystiedot: Yhteystieto[];
}

export abstract class KuulutusKutsuAdapter<T extends KuulutusKutsuAdapterProps> extends CommonKutsuAdapter {
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

  abstract get kuulutusNimiCapitalized(): string;
  abstract get kuulutusYllapitoUrl(): string;

  get kuulutusNimi(): string {
    return this.kuulutusNimiCapitalized.toLowerCase();
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
      } else if (organisaatio) {
        const orgKey = organisaatio.toUpperCase().replace(/Ä/g, "A").replace(/Ö/g, "O").replace(/ /g, "_");
        const kaannos = translate(`viranomainen.${orgKey}`, this.kieli);
        if (kaannos) {
          organisaatio = kaannos;
        }
      }
      return `${organisaatio ? organisaatio + ", " : ""}${formatNimi(y)}, ${this.kieli === Kieli.RUOTSI ? "tel" : "puh"}. ${
        y.puhelinnumero
      }, ${y.sahkoposti}`;
    });
  }
}
