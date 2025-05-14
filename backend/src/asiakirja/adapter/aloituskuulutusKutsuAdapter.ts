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
import { KayttajaTyyppi, Kieli, KuulutusTekstit, LaskuriTyyppi } from "hassu-common/graphql/apiModel";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { vaylaUserToYhteystieto, yhteystietoPlusKunta } from "../../util/vaylaUserToYhteystieto";
import { assertIsDefined } from "../../util/assertions";
import { kuntametadata } from "hassu-common/kuntametadata";
import { formatProperNoun } from "hassu-common/util/formatProperNoun";
import { calculateEndDate } from "../../endDateCalculator/endDateCalculatorHandler";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { KuulutusKutsuAdapter, KuulutusKutsuAdapterProps } from "./kuulutusKutsuAdapter";
import { log } from "../../logger";

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
    const suunnitteluSopimusYhteystiedot: Yhteystieto[] = [];
    let muutYhteystiedot: Yhteystieto[] = [];
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

    if (this.suunnitteluSopimus && this.suunnitteluSopimus?.osapuolet) {
      this.suunnitteluSopimus?.osapuolet?.forEach((osapuoli) => {
        if (osapuoli.osapuolenHenkilot && osapuoli.osapuolenHenkilot.length > 0) {
          const organisaationNimi = this.kieli == Kieli.SUOMI ? osapuoli.osapuolenNimiFI : osapuoli.osapuolenNimiSV;
          osapuoli.osapuolenHenkilot.forEach((henkilo) => {
            suunnitteluSopimusYhteystiedot.push({
              etunimi: henkilo.etunimi || "",
              sukunimi: henkilo.sukunimi || "",
              sahkoposti: henkilo.email || "",
              puhelinnumero: henkilo.puhelinnumero || "",
              organisaatio: henkilo.yritys || organisaationNimi || "",
            });
          });
        }
      });
    }

    if (yhteystiedot) {
      muutYhteystiedot = muutYhteystiedot.concat(yhteystiedot.map((yt) => yhteystietoPlusKunta(yt, suunnitteluSopimus)));
    }
    if (yhteysHenkilot) {
      if (!this.kayttoOikeudet) {
        throw new Error("BUG: Kayttöoikeudet pitää antaa jos yhteyshenkilöt on annettu.");
      }
      this.getUsersForUsernames(yhteysHenkilot).forEach((user) => {
        muutYhteystiedot.push(vaylaUserToYhteystieto(user, this.suunnitteluSopimus));
      });
    }

    yt = suunnitteluSopimusYhteystiedot.concat(muutYhteystiedot);

    if (pakotaProjariTaiKunnanEdustaja) {
      const projari = this.kayttoOikeudet?.find((ko) => ko.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO);

      if (this.suunnitteluSopimus && kunnanEdustaja && !yt.find((t) => t.sahkoposti === kunnanEdustaja?.email)) {
        yt = [vaylaUserToYhteystieto(kunnanEdustaja as DBVaylaUser, this.suunnitteluSopimus)].concat(yt);
      } else if (projari && !yt.find((t) => t.sahkoposti === projari?.email)) {
        yt = [vaylaUserToYhteystieto(projari as DBVaylaUser, this.suunnitteluSopimus)].concat(yt);
      }
    }

    log.info("aloituskuulutuskutsuadapter: ", this.suunnitteluSopimus);

    return yt.map((yt) => this.yhteystietoMapper(yt));
  }

  get suunnittelusopimusKunta(): string {
    const suunnitteluSopimus = this.suunnitteluSopimus;
    if (this.isOsapuoletOlemassa) {
      const nimet = this.props
        .suunnitteluSopimus!.osapuolet!.map((osapuoli) => {
          return this.kieli == Kieli.SUOMI ? osapuoli.osapuolenNimiFI : osapuoli.osapuolenNimiSV;
        })
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

  get isOsapuoletOlemassa(): boolean {
    if (this.props.suunnitteluSopimus && this.props.suunnitteluSopimus.osapuolet && this.props.suunnitteluSopimus.osapuolet.length > 0) {
      return true;
    }
    return false;
  }

  kutsuja(): string | undefined {
    if (this.props.suunnitteluSopimus && this.props.suunnitteluSopimus.kunta && this.props.suunnitteluSopimus.kunta !== undefined) {
      return kuntametadata.nameForKuntaId(this.props.suunnitteluSopimus.kunta, this.kieli);
    }
    if (this.isOsapuoletOlemassa) {
      const nimet = this.props
        .suunnitteluSopimus!.osapuolet!.map((osapuoli) => osapuoli.osapuolenNimiFI)
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
