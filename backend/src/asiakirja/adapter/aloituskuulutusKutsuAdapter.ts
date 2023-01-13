import { CommonKutsuAdapter, CommonKutsuAdapterProps, LokalisoituYhteystieto } from "./commonKutsuAdapter";
import {
  DBVaylaUser,
  IlmoituksenVastaanottajat,
  SuunnitteluSopimus,
  SuunnitteluSopimusJulkaisu,
  UudelleenKuulutus,
  Yhteystieto,
} from "../../database/model";
import { KayttajaTyyppi } from "../../../../common/graphql/apiModel";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { vaylaUserToYhteystieto, yhteystietoPlusKunta } from "../../util/vaylaUserToYhteystieto";
import { assertIsDefined } from "../../util/assertions";
import { kuntametadata } from "../../../../common/kuntametadata";
import { formatProperNoun } from "../../../../common/util/formatProperNoun";
import { formatDate } from "../asiakirjaUtil";
import { formatNimi } from "../../util/userUtil";

export interface AloituskuulutusKutsuAdapterProps extends CommonKutsuAdapterProps {
  kuulutusPaiva: string;
  kuulutusVaihePaattyyPaiva?: string;
  suunnitteluSopimus?: SuunnitteluSopimus | SuunnitteluSopimusJulkaisu | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  yhteystiedot: Yhteystieto[];
}

export class AloituskuulutusKutsuAdapter extends CommonKutsuAdapter {
  readonly suunnitteluSopimus?: SuunnitteluSopimusJulkaisu | SuunnitteluSopimus | null;
  readonly ilmoituksenVastaanottajat: IlmoituksenVastaanottajat | null | undefined;
  readonly uudelleenKuulutus?: UudelleenKuulutus | null;
  private readonly props: AloituskuulutusKutsuAdapterProps;

  constructor(props: AloituskuulutusKutsuAdapterProps) {
    super(props);
    const { suunnitteluSopimus, ilmoituksenVastaanottajat, uudelleenKuulutus } = props;
    this.suunnitteluSopimus = suunnitteluSopimus;
    this.ilmoituksenVastaanottajat = ilmoituksenVastaanottajat;
    this.uudelleenKuulutus = uudelleenKuulutus;
    this.props = props;
  }

  get subject(): string {
    return {
      [AsiakirjanMuoto.TIE]: "SUUNNITELMAN LAATIJAN KUTSUSTA YLEISÖTILAISUUTEEN ILMOITTAMINEN",
      [AsiakirjanMuoto.RATA]: "",
    }[this.asiakirjanMuoto];
  }

  yhteystiedot(
    yhteystiedot: Yhteystieto[] | null | undefined,
    yhteysHenkilot?: string[] | null,
    pakotaProjariTaiKunnanEdustaja?: boolean
  ): LokalisoituYhteystieto[] {
    let yt: Yhteystieto[] = [];
    let suunnitteluSopimus: SuunnitteluSopimusJulkaisu;
    const kunnanEdustaja = this.kayttoOikeudet?.find(
      (ko) =>
        ko.email === (this.suunnitteluSopimus as SuunnitteluSopimusJulkaisu)?.email ||
        ko.kayttajatunnus === (this.suunnitteluSopimus as SuunnitteluSopimus)?.yhteysHenkilo
    );
    if (kunnanEdustaja && this.suunnitteluSopimus) {
      suunnitteluSopimus = {
        ...kunnanEdustaja,
        kunta: this.suunnitteluSopimus.kunta,
        puhelinnumero: kunnanEdustaja.puhelinnumero || "",
      };
    }
    if (yhteystiedot) {
      yt = yt.concat(yhteystiedot.map((yt) => yhteystietoPlusKunta(yt, suunnitteluSopimus)));
    }
    if (yhteysHenkilot) {
      if (!this.kayttoOikeudet) {
        throw new Error("BUG: Kayttöoikeudet pitää antaa jos yhteyshenkilöt on annettu.");
      }
      this.getUsersForUsernames(yhteysHenkilot || []).forEach((user) => {
        yt.push(vaylaUserToYhteystieto(user, this.suunnitteluSopimus));
      });
    }
    if (pakotaProjariTaiKunnanEdustaja) {
      const projari = this.kayttoOikeudet?.find((ko) => ko.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO);

      if (this.suunnitteluSopimus && !yt.find((t) => t.sahkoposti === kunnanEdustaja?.email)) {
        yt = [vaylaUserToYhteystieto(kunnanEdustaja as DBVaylaUser, this.suunnitteluSopimus)].concat(yt);
      } else if (!yt.find((t) => t.sahkoposti === projari?.email)) {
        yt = [vaylaUserToYhteystieto(projari as DBVaylaUser, this.suunnitteluSopimus)].concat(yt);
      }
    }

    return yt.map((yt) => this.yhteystietoMapper(yt));
  }

  get suunnittelusopimusKunta(): string {
    const suunnitteluSopimus = this.suunnitteluSopimus;
    assertIsDefined(suunnitteluSopimus?.kunta, "Suunnittelusopimuksella pitää olla kunta");
    return kuntametadata.nameForKuntaId(suunnitteluSopimus?.kunta, this.kieli);
  }

  get suunnitelmasta_vastaavalla_tai_rataverkon_haltijalla(): string {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.text("asiakirja.aloituskuulutus.rataverkon_haltijalla");
    }
    return this.text("asiakirja.aloituskuulutus.suunnitelmasta_vastaavalla");
  }

  get lakiviite_tutkimusoikeus(): string {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.text("asiakirja.aloituskuulutus.lakiviite_tutkimusoikeus_rata");
    }
    return this.text("asiakirja.aloituskuulutus.lakiviite_tutkimusoikeus_tie");
  }

  get lakiviite_muistutus(): string {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.text("asiakirja.aloituskuulutus.lakiviite_muistutus_rata");
    }
    return this.text("asiakirja.aloituskuulutus.lakiviite_muistutus_tie");
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

  get kuuluttaja(): string {
    const suunnitteluSopimus = this.suunnitteluSopimus;
    if (suunnitteluSopimus?.kunta) {
      return formatProperNoun(kuntametadata.nameForKuntaId(suunnitteluSopimus.kunta, this.kieli));
    }
    return super.kuuluttaja;
  }

  get kuuluttaja_pitka(): string {
    const suunnitteluSopimus = this.suunnitteluSopimus;
    if (suunnitteluSopimus?.kunta) {
      return formatProperNoun(kuntametadata.nameForKuntaId(suunnitteluSopimus.kunta, this.kieli));
    }
    return super.kuuluttaja_pitka;
  }

  get uudelleenKuulutusSeloste(): string | undefined {
    if (this.uudelleenKuulutus?.selosteKuulutukselle) {
      return this.uudelleenKuulutus?.selosteKuulutukselle[this.kieli];
    }
  }

  get kuulutusPaiva(): string {
    return this.props.kuulutusPaiva ? new Date(this.props.kuulutusPaiva).toLocaleDateString("fi") : "DD.MM.YYYY";
  }

  get kuulutusNahtavillaAika(): string {
    return this.formatDateRange(this.props.kuulutusPaiva, this.props.kuulutusVaihePaattyyPaiva);
  }

  formatDateRange(startDate: string, endDate?: string): string {
    if (endDate) {
      return formatDate(startDate) + "-" + formatDate(endDate);
    }
    return formatDate(startDate);
  }

  get simple_yhteystiedot(): string[] {
    return this.props.yhteystiedot.map(
      (y) =>
        `${y.kunta ? kuntametadata.nameForKuntaId(y.kunta, this.kieli) : y.organisaatio}, ${formatNimi(y)}, puh. ${y.puhelinnumero}, ${
          y.sahkoposti
        }`
    );
  }

  kutsuja(): string | undefined {
    if (this.props.suunnitteluSopimus) {
      return kuntametadata.nameForKuntaId(this.props.suunnitteluSopimus.kunta, this.kieli);
    }
    return super.kutsuja();
  }
}
