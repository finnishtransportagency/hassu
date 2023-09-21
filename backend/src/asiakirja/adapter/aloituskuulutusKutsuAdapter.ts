import { CommonKutsuAdapter, CommonKutsuAdapterProps, LokalisoituYhteystieto } from "./commonKutsuAdapter";
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
import { KayttajaTyyppi, KuulutusTekstit, LaskuriTyyppi } from "hassu-common/graphql/apiModel";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { vaylaUserToYhteystieto, yhteystietoPlusKunta } from "../../util/vaylaUserToYhteystieto";
import { assertIsDefined } from "../../util/assertions";
import { kuntametadata } from "hassu-common/kuntametadata";
import { formatProperNoun } from "hassu-common/util/formatProperNoun";
import { formatNimi } from "../../util/userUtil";
import { calculateEndDate } from "../../endDateCalculator/endDateCalculatorHandler";
import { organisaatioIsEly } from "../../util/organisaatioIsEly";
import { translate } from "../../util/localization";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

export async function createAloituskuulutusKutsuAdapterProps(
  oid: string,
  lyhytOsoite: string | undefined | null,
  kayttoOikeudet: DBVaylaUser[],
  kieli: KaannettavaKieli,
  aloitusKuulutusJulkaisu?: AloitusKuulutusJulkaisu,
  euRahoitusLogot?: LocalizedMap<string> | null,
  vahainenMenettely?: boolean | null
): Promise<AloituskuulutusKutsuAdapterProps> {
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
  readonly props: AloituskuulutusKutsuAdapterProps;
  readonly vahainenMenettely: boolean | null | undefined;

  constructor(props: AloituskuulutusKutsuAdapterProps) {
    super(props);
    const { suunnitteluSopimus, ilmoituksenVastaanottajat, uudelleenKuulutus, vahainenMenettely } = props;
    this.suunnitteluSopimus = suunnitteluSopimus;
    this.ilmoituksenVastaanottajat = ilmoituksenVastaanottajat;
    this.uudelleenKuulutus = uudelleenKuulutus;
    this.vahainenMenettely = vahainenMenettely;
    this.props = props;
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
      this.getUsersForUsernames(yhteysHenkilot).forEach((user) => {
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

  get lakiviite_vahainen_menettely(): string {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.text("asiakirja.aloituskuulutus.lakiviite_vahainen_menettely_rata");
    }
    return this.text("asiakirja.aloituskuulutus.lakiviite_vahainen_menettely_tie");
  }

  get lakiviite_kappale4_vahainen_menettely(): string {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.text("asiakirja.aloituskuulutus.lakiviite_kappale4_vahainen_menettely_rata");
    }
    return this.text("asiakirja.aloituskuulutus.lakiviite_kappale4_vahainen_menettely_tie");
  }

  get aloituskuulutus_vahainen_menettely_lakiviite(): string {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.text("asiakirja.aloituskuulutus_vahainen_menettely_lakiviite_rata");
    }
    return this.text("asiakirja.aloituskuulutus_vahainen_menettely_lakiviite_tie");
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
    return this.uudelleenKuulutus?.selosteLahetekirjeeseen?.[this.kieli];
  }

  get kuulutusPaiva(): string {
    return this.props.kuulutusPaiva ? new Date(this.props.kuulutusPaiva).toLocaleDateString("fi") : "DD.MM.YYYY";
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
      return `${organisaatio}, ${formatNimi(y)}, puh. ${y.puhelinnumero}, ${y.sahkoposti}`;
    });
  }

  kutsuja(): string | undefined {
    if (this.props.suunnitteluSopimus) {
      return kuntametadata.nameForKuntaId(this.props.suunnitteluSopimus.kunta, this.kieli);
    }
    return super.kutsuja();
  }

  get userInterfaceFields(): KuulutusTekstit {
    let kappale1;
    if (this.suunnitteluSopimus) {
      kappale1 = this.htmlText("asiakirja.aloituskuulutus.kappale1_suunnittelusopimus");
    } else if (this.vahainenMenettely) {
      kappale1 = this.htmlText("asiakirja.aloituskuulutus.kappale1_vahainen_menettely");
    } else {
      kappale1 = this.htmlText("asiakirja.aloituskuulutus.kappale1");
    }
    return {
      __typename: "KuulutusTekstit",
      leipaTekstit: [kappale1],
      kuvausTekstit: [this.htmlText("asiakirja.aloituskuulutus.kappale2_ui")],
      infoTekstit: [
        this.htmlText("asiakirja.aloituskuulutus.kappale3"),
        this.vahainenMenettely
          ? this.htmlText("asiakirja.aloituskuulutus.kappale4_vahainen_menettely")
          : this.htmlText("asiakirja.aloituskuulutus.kappale4"),
      ],
      tietosuoja: this.htmlText("asiakirja.tietosuoja", { extLinks: true }),
    };
  }
}
