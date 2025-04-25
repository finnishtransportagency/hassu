import { LokalisoituYhteystieto } from "./commonKutsuAdapter";
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
import { calculateEndDate } from "../../endDateCalculator/endDateCalculatorHandler";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { KuulutusKutsuAdapter, KuulutusKutsuAdapterProps } from "./kuulutusKutsuAdapter";

type PropsCreatorOptions = {
  oid: string;
  lyhytOsoite: string | undefined | null;
  kayttoOikeudet: DBVaylaUser[];
  kieli: KaannettavaKieli;
  asianhallintaPaalla: boolean;
  linkkiAsianhallintaan: string | undefined;
  aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu | undefined;
  euRahoitusLogot: LocalizedMap<string> | null | undefined;
  vahainenMenettely: boolean | null | undefined;
  kuulutettuYhdessaSuunnitelmanimi: string | undefined;
};

export async function createAloituskuulutusKutsuAdapterProps({
  oid,
  lyhytOsoite,
  kayttoOikeudet,
  kieli,
  asianhallintaPaalla,
  linkkiAsianhallintaan,
  aloitusKuulutusJulkaisu,
  euRahoitusLogot,
  vahainenMenettely,
  kuulutettuYhdessaSuunnitelmanimi,
}: PropsCreatorOptions): Promise<AloituskuulutusKutsuAdapterProps> {
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
    suunnitteluSopimus: aloitusKuulutusJulkaisu.suunnitteluSopimus ?? undefined,
    kayttoOikeudet,
    uudelleenKuulutus: aloitusKuulutusJulkaisu.uudelleenKuulutus ?? undefined,
    euRahoitusLogot: euRahoitusLogot ?? undefined,
    vahainenMenettely,
    asianhallintaPaalla,
    linkkiAsianhallintaan,
    kuulutettuYhdessaSuunnitelmanimi,
  };
}

export interface AloituskuulutusKutsuAdapterProps extends KuulutusKutsuAdapterProps {}

export class AloituskuulutusKutsuAdapter extends KuulutusKutsuAdapter<AloituskuulutusKutsuAdapterProps> {
  readonly suunnitteluSopimus?: SuunnitteluSopimusJulkaisu | SuunnitteluSopimus | null;
  readonly ilmoituksenVastaanottajat: IlmoituksenVastaanottajat | null | undefined;
  readonly uudelleenKuulutus?: UudelleenKuulutus | null;
  readonly vahainenMenettely: boolean | null | undefined;

  constructor(props: AloituskuulutusKutsuAdapterProps) {
    super(props);
    const { suunnitteluSopimus, ilmoituksenVastaanottajat, uudelleenKuulutus, vahainenMenettely } = props;
    this.suunnitteluSopimus = suunnitteluSopimus;
    this.ilmoituksenVastaanottajat = ilmoituksenVastaanottajat;
    this.uudelleenKuulutus = uudelleenKuulutus;
    this.vahainenMenettely = vahainenMenettely;
  }

  get kuulutusNimiCapitalized(): string {
    return "Aloituskuulutus";
  }

  get kuulutusYllapitoUrl(): string {
    return super.aloituskuulutusYllapitoUrl;
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
        puhelinnumero: kunnanEdustaja.puhelinnumero ?? "",
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
    if (this.isOsapuoletInUse) {
      const nimet = this.props
        .suunnitteluSopimus!.osapuolet!.map((osapuoli) => osapuoli.osapuolenNimiEnsisijainen)
        .filter((nimi) => nimi !== undefined && nimi !== null);
      if (nimet.length > 0) {
        return nimet.join(", ");
      }
    }
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

  get isOsapuoletInUse(): boolean {
    if (this.props.suunnitteluSopimus && this.props.suunnitteluSopimus.osapuolet && this.props.suunnitteluSopimus.osapuolet.length > 0) {
      return true;
    }
    return false;
  }

  kutsuja(): string | undefined {
    if (this.props.suunnitteluSopimus && this.props.suunnitteluSopimus.kunta && this.props.suunnitteluSopimus.kunta !== undefined) {
      return kuntametadata.nameForKuntaId(this.props.suunnitteluSopimus.kunta, this.kieli);
    }
    if (this.isOsapuoletInUse) {
      const nimet = this.props
        .suunnitteluSopimus!.osapuolet!.map((osapuoli) => osapuoli.osapuolenNimiEnsisijainen)
        .filter((nimi) => nimi !== undefined && nimi !== null);
      if (nimet.length > 0) {
        return nimet.join(", ");
      }
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
