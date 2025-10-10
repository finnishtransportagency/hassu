import { DBProjekti, HyvaksymisPaatosVaiheJulkaisu, KasittelynTila } from "../../database/model";
import { HallintoOikeus, Kieli, KuulutusTekstit } from "hassu-common/graphql/apiModel";
import { assertIsDefined } from "../../util/assertions";
import { AsiakirjanMuoto, Osoite } from "../asiakirjaTypes";
import { formatDate } from "../asiakirjaUtil";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { KuulutusKutsuAdapter, KuulutusKutsuAdapterProps } from "./kuulutusKutsuAdapter";
import { formatProperNoun } from "hassu-common/util/formatProperNoun";
import { kuntametadata } from "hassu-common/kuntametadata";

function getPaatoksenPvm(kasittelynTila: KasittelynTila, paatosTyyppi: PaatosTyyppi): string {
  if (paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS) {
    return kasittelynTila.hyvaksymispaatos?.paatoksenPvm as string;
  } else if (paatosTyyppi === PaatosTyyppi.JATKOPAATOS1) {
    return kasittelynTila.ensimmainenJatkopaatos?.paatoksenPvm as string;
  } else {
    return kasittelynTila.toinenJatkopaatos?.paatoksenPvm as string;
  }
}

function getAsiaNumero(kasittelynTila: KasittelynTila, paatosTyyppi: PaatosTyyppi): string {
  if (paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS) {
    return kasittelynTila.hyvaksymispaatos?.asianumero as string;
  } else if (paatosTyyppi === PaatosTyyppi.JATKOPAATOS1) {
    return kasittelynTila.ensimmainenJatkopaatos?.asianumero as string;
  } else {
    return kasittelynTila.toinenJatkopaatos?.asianumero as string;
  }
}

type PropsCreatorOptions = {
  projekti: Pick<DBProjekti, "oid" | "kasittelynTila" | "lyhytOsoite" | "kayttoOikeudet" | "euRahoitusLogot" | "suunnitteluSopimus">;
  kieli: KaannettavaKieli;
  hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  paatosTyyppi: PaatosTyyppi;
  asianhallintaPaalla: boolean;
  linkkiAsianhallintaan: string | undefined;
  osoite: Osoite | undefined;
  kuulutettuYhdessaSuunnitelmanimi: string | undefined;
};

export function createHyvaksymisPaatosVaiheKutsuAdapterProps({
  projekti,
  kieli,
  hyvaksymisPaatosVaihe,
  paatosTyyppi,
  asianhallintaPaalla,
  linkkiAsianhallintaan,
  osoite,
  kuulutettuYhdessaSuunnitelmanimi,
}: PropsCreatorOptions): HyvaksymisPaatosVaiheKutsuAdapterProps {
  const { kasittelynTila, oid, lyhytOsoite, kayttoOikeudet, euRahoitusLogot, suunnitteluSopimus } = projekti;
  assertIsDefined(kasittelynTila, "kasittelynTila puuttuu");
  if (paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS) {
    assertIsDefined(kasittelynTila.hyvaksymispaatos?.paatoksenPvm, "kasittelynTila.hyvaksymispaatos.paatoksenPvm puuttuu");
    assertIsDefined(kasittelynTila.hyvaksymispaatos?.asianumero, "kasittelynTila.hyvaksymispaatos.asianumero puuttuu");
  } else if (paatosTyyppi === PaatosTyyppi.JATKOPAATOS1) {
    assertIsDefined(kasittelynTila.ensimmainenJatkopaatos?.paatoksenPvm, "kasittelynTila.hyvaksymispaatos.paatoksenPvm puuttuu");
    assertIsDefined(kasittelynTila.ensimmainenJatkopaatos?.asianumero, "kasittelynTila.hyvaksymispaatos.asianumero puuttuu");
  } else {
    assertIsDefined(kasittelynTila.toinenJatkopaatos?.paatoksenPvm, "kasittelynTila.hyvaksymispaatos.paatoksenPvm puuttuu");
    assertIsDefined(kasittelynTila.toinenJatkopaatos?.asianumero, "kasittelynTila.hyvaksymispaatos.asianumero puuttuu");
  }
  const velho = hyvaksymisPaatosVaihe.velho;
  assertIsDefined(velho, "hyvaksymisPaatosVaihe.velho puuttuu");
  assertIsDefined(velho.tyyppi, "hyvaksymisPaatosVaihe.velho.tyyppi puuttuu");
  assertIsDefined(velho.vaylamuoto, "hyvaksymisPaatosVaihe.velho.vaylamuoto puuttuu");
  assertIsDefined(hyvaksymisPaatosVaihe.kuulutusPaiva, "hyvaksymisPaatosVaihe.kuulutusPaiva puuttuu");
  assertIsDefined(hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva, "hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva puuttuu");
  assertIsDefined(hyvaksymisPaatosVaihe.hallintoOikeus, "hyvaksymisPaatosVaihe.hallintoOikeus puuttuu");
  return {
    oid,
    lyhytOsoite,
    kielitiedot: hyvaksymisPaatosVaihe.kielitiedot,
    hankkeenKuvaus: { [Kieli.SUOMI]: "", [Kieli.RUOTSI]: "" },
    kuulutusPaiva: hyvaksymisPaatosVaihe.kuulutusPaiva,
    kuulutusVaihePaattyyPaiva: hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva,
    velho: hyvaksymisPaatosVaihe.velho,
    yhteystiedot: hyvaksymisPaatosVaihe.yhteystiedot,
    kayttoOikeudet,
    kieli,
    paatoksenPvm: getPaatoksenPvm(kasittelynTila, paatosTyyppi),
    asianumero: getAsiaNumero(kasittelynTila, paatosTyyppi),
    hallintoOikeus: hyvaksymisPaatosVaihe.hallintoOikeus,
    euRahoitusLogot,
    ilmoituksenVastaanottajat: hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat,
    uudelleenKuulutus: hyvaksymisPaatosVaihe.uudelleenKuulutus ?? undefined,
    suunnitteluSopimus,
    paatosTyyppi,
    viimeinenVoimassaolovuosi: hyvaksymisPaatosVaihe.viimeinenVoimassaolovuosi,
    asianhallintaPaalla,
    linkkiAsianhallintaan,
    osoite,
    kuulutettuYhdessaSuunnitelmanimi,
  };
}

export interface HyvaksymisPaatosVaiheKutsuAdapterProps extends KuulutusKutsuAdapterProps {
  paatoksenPvm: string;
  asianumero: string;
  hallintoOikeus: HallintoOikeus;
  paatosTyyppi: PaatosTyyppi;
  viimeinenVoimassaolovuosi?: string | null;
  osoite?: Osoite;
}

export class HyvaksymisPaatosVaiheKutsuAdapter extends KuulutusKutsuAdapter<HyvaksymisPaatosVaiheKutsuAdapterProps> {
  private lakiKey: string;
  constructor(props: HyvaksymisPaatosVaiheKutsuAdapterProps, lakiKey = "lain") {
    super(props, "asiakirja.hyvaksymispaatoksesta_ilmoittaminen.");
    this.lakiKey = lakiKey;
  }

  get kuulutusNimiCapitalized(): string {
    const kuulutusNimet: Record<PaatosTyyppi, string> = {
      HYVAKSYMISPAATOS: "Hyväksymispäätöskuulutus",
      JATKOPAATOS1: "Jatkopäätöskuulutus",
      JATKOPAATOS2: "Jatkopäätöskuulutus",
    };
    return kuulutusNimet[this.props.paatosTyyppi];
  }

  get kuulutusYllapitoUrl(): string {
    assertIsDefined(this.oid);
    const yllapitoUrls: Record<PaatosTyyppi, string> = {
      HYVAKSYMISPAATOS: super.hyvaksymispaatosYllapitoUrl,
      JATKOPAATOS1: super.jatkopaatos1YllapitoUrl,
      JATKOPAATOS2: super.jatkopaatos2YllapitoUrl,
    };
    return yllapitoUrls[this.props.paatosTyyppi];
  }

  get lain(): string {
    return this.tieRataOptionTextFor(this.lakiKey);
  }

  get lakiviite_hyvaksymispaatoksesta_ilmoittaminen(): string {
    return this.tieRataOptionTextFor("lakiviite_hyvaksymispaatoksesta_ilmoittaminen");
  }

  get lakiviite_kuulutuksesta_ilmoittaminen(): string {
    return this.tieRataOptionTextFor("lakiviite_kuulutuksesta_ilmoittaminen");
  }

  get lakiviite_muistuttajille(): string {
    return this.tieRataOptionTextFor("lakiviite_muistuttajille");
  }

  hyvaksymis_pvm(): string {
    return formatDate(this.props.paatoksenPvm);
  }

  asianumero_traficom(): string {
    return this.props.asianumero;
  }

  get kuulutusVaihePaattyyPaiva(): string {
    return this.props.kuulutusVaihePaattyyPaiva ? formatDate(this.props.kuulutusVaihePaattyyPaiva) : "DD.MM.YYYY";
  }

  hallinto_oikeus_genetiivi(): string {
    return this.text("hallinto_oikeus_genetiivi." + this.props.hallintoOikeus);
  }

  kuulutusosoite(): string {
    return this.isVaylaTilaaja()
      ? "https://www.vayla.fi/kuulutukset"
      : this.isElyTilaaja()
      ? "https://www.ely-keskus.fi/kuulutukset"
      : "https://www.elinvoimakeskus.fi/kuulutukset";
  }

  get linkki_paatos(): string {
    assertIsDefined(this.oid);
    if (this.props.paatosTyyppi === PaatosTyyppi.JATKOPAATOS1) {
      return super.linkki_jatkopaatos1;
    } else if (this.props.paatosTyyppi === PaatosTyyppi.JATKOPAATOS2) {
      return super.linkki_jatkopaatos2;
    } else {
      return super.linkki_hyvaksymispaatos;
    }
  }

  get viimeinen_voimassaolovuosi(): string | null | undefined {
    return this.props.viimeinenVoimassaolovuosi;
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

  get userInterfaceFields(): KuulutusTekstit | undefined {
    let kappale1;
    const typeKey = this.props.paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS ? "hyvaksymispaatoksesta" : "jatkopaatos";
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      kappale1 = this.htmlText(`asiakirja.kuulutus_${typeKey}.tie_kappale1`);
    } else if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      kappale1 = this.htmlText(`asiakirja.kuulutus_${typeKey}.rata_kappale1`);
    } else {
      return undefined;
    }

    return {
      __typename: "KuulutusTekstit",
      leipaTekstit: [
        kappale1,
        this.htmlText(`asiakirja.kuulutus_${typeKey}.kappale2_ui`),
        this.htmlText(`asiakirja.kuulutus_${typeKey}.kappale3`),
        this.htmlText(`asiakirja.kuulutus_${typeKey}.kappale4`),
      ],
      kuvausTekstit: [],
      infoTekstit: [this.htmlText(`asiakirja.kuulutus_${typeKey}.kappale5`)],
      tietosuoja: this.htmlText("asiakirja.tietosuoja", false, { extLinks: true }),
    };
  }
}
