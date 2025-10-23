import { CommonKutsuAdapter, CommonKutsuAdapterProps } from "./commonKutsuAdapter";
import { IlmoituksenVastaanottajat, UudelleenKuulutus, Yhteystieto } from "../../database/model";
import { kuntametadata } from "hassu-common/kuntametadata";
import { formatNimi } from "../../util/userUtil";
import { organisaatioIsEly, organisaatioIsEvk } from "hassu-common/util/organisaatioIsEly";
import { translate } from "../../util/localization";
import { formatDate } from "../asiakirjaUtil";
import { Kieli } from "hassu-common/graphql/apiModel";
import { formatProperNoun } from "hassu-common/util/formatProperNoun";

export interface KuulutusKutsuAdapterProps extends CommonKutsuAdapterProps {
  kuulutusPaiva?: string;
  kuulutusVaihePaattyyPaiva?: string;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  kuulutettuYhdessaSuunnitelmanimi: string | undefined;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  yhteystiedot?: Yhteystieto[];
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

  get kuuluttaja(): string {
    const suunnitteluSopimus = this.suunnitteluSopimus;
    if (suunnitteluSopimus) {
      if (suunnitteluSopimus.kunta) {
        return formatProperNoun(kuntametadata.nameForKuntaId(suunnitteluSopimus.kunta, this.kieli));
      } else if (suunnitteluSopimus.osapuolet && suunnitteluSopimus.osapuolet.length > 0) {
        const osapuoliNimet = suunnitteluSopimus.osapuolet
          .map((osapuoli) => {
            if (this.kieli === "RUOTSI") {
              return osapuoli.osapuolenNimiSV;
            } else {
              return osapuoli.osapuolenNimiFI;
            }
          })
          .filter((nimi) => nimi && nimi.trim() !== "");

        if (osapuoliNimet.length === 0) {
          return super.kuuluttaja;
        } else if (osapuoliNimet.length === 1) {
          return formatProperNoun(osapuoliNimet[0] as any);
        } else if (osapuoliNimet.length === 2) {
          const ja = this.text("ja");
          return formatProperNoun(osapuoliNimet[0] as any) + " " + ja + " " + formatProperNoun(osapuoliNimet[1] as any);
        } else {
          const ja = this.text("ja");
          const viimeinenNimi = osapuoliNimet.pop();
          return (
            osapuoliNimet.map((nimi) => formatProperNoun(nimi as any)).join(", ") + " " + ja + " " + formatProperNoun(viimeinenNimi as any)
          );
        }
      }
    }
    return super.kuuluttaja;
  }

  get kuuluttaja_pitka(): string {
    const suunnitteluSopimus = this.suunnitteluSopimus;
    if (suunnitteluSopimus) {
      if (suunnitteluSopimus?.kunta) {
        return formatProperNoun(kuntametadata.nameForKuntaId(suunnitteluSopimus.kunta, this.kieli));
      } else if (suunnitteluSopimus.osapuolet && suunnitteluSopimus.osapuolet.length > 0) {
        const osapuoliNimet = suunnitteluSopimus.osapuolet
          .map((osapuoli) => {
            if (this.kieli === "RUOTSI") {
              return osapuoli.osapuolenNimiSV;
            } else {
              return osapuoli.osapuolenNimiFI;
            }
          })
          .filter((nimi) => nimi && nimi.trim() !== "");

        if (osapuoliNimet.length === 0) {
          return super.kuuluttaja_pitka;
        } else if (osapuoliNimet.length === 1) {
          return formatProperNoun(osapuoliNimet[0] as any);
        } else if (osapuoliNimet.length === 2) {
          const ja = this.text("ja");
          return formatProperNoun(osapuoliNimet[0] as any) + " " + ja + " " + formatProperNoun(osapuoliNimet[1] as any);
        } else {
          const ja = this.text("ja");
          const viimeinenNimi = osapuoliNimet.pop();
          return (
            osapuoliNimet.map((nimi) => formatProperNoun(nimi as any)).join(", ") + " " + ja + " " + formatProperNoun(viimeinenNimi as any)
          );
        }
      }
    }
    return super.kuuluttaja_pitka;
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
    if (!this.props.kuulutusPaiva) {
      return "";
    }
    return this.formatDateRange(this.props.kuulutusPaiva, this.props.kuulutusVaihePaattyyPaiva);
  }

  get simple_yhteystiedot(): string[] {
    if (!this.props.yhteystiedot) {
      return [];
    }
    return this.props.yhteystiedot.map((y) => {
      let organisaatio = y.organisaatio;
      if (y.kunta) {
        organisaatio = kuntametadata.nameForKuntaId(y.kunta, this.kieli);
      } else if (organisaatioIsEly(y.organisaatio) && y.elyOrganisaatio) {
        const kaannos = translate(`viranomainen.${y.elyOrganisaatio}`, this.kieli);
        if (kaannos) {
          organisaatio = kaannos;
        }
      } else if (organisaatioIsEvk(y.organisaatio) && y.evkOrganisaatio) {
        const kaannos = translate(`viranomainen.${y.evkOrganisaatio}`, this.kieli);
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
