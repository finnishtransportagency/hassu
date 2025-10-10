import { KirjaamoOsoite, KuulutusTekstit, ProjektiTyyppi } from "hassu-common/graphql/apiModel";
import { formatDate } from "../asiakirjaUtil";
import { AsiakirjanMuoto, Osoite } from "../asiakirjaTypes";
import { DBProjekti, IlmoituksenVastaanottajat, NahtavillaoloVaiheJulkaisu } from "../../database/model";
import { assertIsDefined } from "../../util/assertions";
import { kirjaamoOsoitteetService } from "../../kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { kuntametadata } from "hassu-common/kuntametadata";
import { organisaatioIsEly, organisaatioIsEvk } from "hassu-common/util/organisaatioIsEly";
import { formatNimi } from "../../util/userUtil";
import { translate } from "../../util/localization";
import { KuulutusKutsuAdapter, KuulutusKutsuAdapterProps } from "./kuulutusKutsuAdapter";
import { formatProperNoun } from "hassu-common/util/formatProperNoun";

type PropsCreatorOptions = {
  projekti: Pick<
    DBProjekti,
    "oid" | "lyhytOsoite" | "kayttoOikeudet" | "suunnitteluSopimus" | "euRahoitusLogot" | "vahainenMenettely" | "velho"
  >;
  julkaisu: NahtavillaoloVaiheJulkaisu;
  kieli: KaannettavaKieli;
  asianhallintaPaalla: boolean;
  linkkiAsianhallintaan: string | undefined;
  osoite: Osoite | undefined;
  kuulutettuYhdessaSuunnitelmanimi: string | undefined;
};

export async function createNahtavillaoloVaiheKutsuAdapterProps({
  projekti,
  julkaisu,
  kieli,
  asianhallintaPaalla,
  linkkiAsianhallintaan,
  osoite,
  kuulutettuYhdessaSuunnitelmanimi,
}: PropsCreatorOptions): Promise<NahtavillaoloVaiheKutsuAdapterProps> {
  const { kayttoOikeudet, oid, euRahoitusLogot, lyhytOsoite, suunnitteluSopimus, vahainenMenettely, velho } = projekti;

  assertIsDefined(julkaisu);
  assertIsDefined(velho);
  assertIsDefined(julkaisu.kuulutusVaihePaattyyPaiva);
  assertIsDefined(julkaisu.hankkeenKuvaus);
  assertIsDefined(julkaisu.kuulutusPaiva, "NahtavillaoloVaiheJulkaisu.kuulutusPaiva puuttuu");

  const kirjaamoOsoitteet = await kirjaamoOsoitteetService.listKirjaamoOsoitteet();
  return {
    oid,
    lyhytOsoite: lyhytOsoite ?? undefined,
    kayttoOikeudet,
    kieli,
    kielitiedot: julkaisu.kielitiedot,
    kuulutusPaiva: julkaisu.kuulutusPaiva,
    kuulutusVaihePaattyyPaiva: julkaisu.kuulutusVaihePaattyyPaiva,
    velho,
    hankkeenKuvaus: julkaisu.hankkeenKuvaus,
    kirjaamoOsoitteet,
    uudelleenKuulutus: julkaisu.uudelleenKuulutus ?? undefined,
    suunnitteluSopimus,
    euRahoitusLogot,
    yhteystiedot: julkaisu.yhteystiedot,
    vahainenMenettely,
    asianhallintaPaalla,
    linkkiAsianhallintaan,
    osoite,
    kuulutettuYhdessaSuunnitelmanimi,
  };
}

export interface NahtavillaoloVaiheKutsuAdapterProps extends KuulutusKutsuAdapterProps {
  kirjaamoOsoitteet: KirjaamoOsoite[];
  osoite?: Osoite;
}

export class NahtavillaoloVaiheKutsuAdapter extends KuulutusKutsuAdapter<NahtavillaoloVaiheKutsuAdapterProps> {
  readonly ilmoituksenVastaanottajat: IlmoituksenVastaanottajat | null | undefined;
  readonly vahainenMenettely: boolean | null | undefined;
  readonly ratalakiKey: string;

  constructor(props: NahtavillaoloVaiheKutsuAdapterProps, ratalakiKey = "lakiviite_ilmoitus_rata") {
    super(props, "asiakirja.kuulutus_nahtavillaolosta.");
    this.ilmoituksenVastaanottajat = props.ilmoituksenVastaanottajat;
    this.vahainenMenettely = props.vahainenMenettely;
    this.ratalakiKey = ratalakiKey;
    this.suunnitteluSopimus = props.suunnitteluSopimus;
  }

  get kuulutusNimiCapitalized(): string {
    return "Nähtävilläolokuulutus";
  }

  get kuulutusYllapitoUrl(): string {
    return super.nahtavillaoloYllapitoUrl;
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
        } else if (organisaatioIsEvk(y.organisaatio) && y.evkOrganisaatio) {
          const kaannos = translate(`viranomainen.${y.evkOrganisaatio}`, this.kieli);
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

  get kuulutusVaihePaattyyPaiva(): string {
    return this.props.kuulutusVaihePaattyyPaiva ? formatDate(this.props.kuulutusVaihePaattyyPaiva) : "DD.MM.YYYY";
  }

  get lakiviite(): string {
    return this.text(this.projektiTyyppi == ProjektiTyyppi.RATA ? this.ratalakiKey : "lakiviite_ilmoitus_tie");
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

  isUseitaOsapuolia(): boolean {
    return (this.suunnitteluSopimus?.osapuolet?.length ?? 0) > 1;
  }

  get userInterfaceFields(): KuulutusTekstit {
    const usePlural = this.isUseitaOsapuolia();
    let kappale1;

    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      kappale1 = this.htmlText("rata_kappale1");
    } else {
      kappale1 = this.htmlText("tie_kappale1", usePlural);
    }
    return {
      __typename: "KuulutusTekstit",
      leipaTekstit: [kappale1],
      kuvausTekstit: [this.htmlText("kappale2", usePlural), this.htmlText("kappale3_ui")],
      infoTekstit: this.vahainenMenettely ? [this.htmlText("kappale4_vahainen_menettely")] : [this.htmlText("kappale4")],
      tietosuoja: this.htmlText("asiakirja.tietosuoja", false, { extLinks: true }),
    };
  }
}
