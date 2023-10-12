import { CommonKutsuAdapter, CommonKutsuAdapterProps } from "./commonKutsuAdapter";
import {
  DBProjekti,
  HyvaksymisPaatosVaiheJulkaisu,
  IlmoituksenVastaanottajat,
  KasittelynTila,
  SuunnitteluSopimus,
  UudelleenKuulutus,
  Yhteystieto,
} from "../../database/model";
import { HallintoOikeus, Kieli, KuulutusTekstit } from "hassu-common/graphql/apiModel";
import { assertIsDefined } from "../../util/assertions";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { formatDate } from "../asiakirjaUtil";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { PaatosTyyppi } from "../../projekti/adapter/projektiAdapterJulkinen";

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

export function createHyvaksymisPaatosVaiheKutsuAdapterProps(
  projekti: Pick<DBProjekti, "oid" | "kasittelynTila" | "lyhytOsoite" | "kayttoOikeudet" | "euRahoitusLogot" | "suunnitteluSopimus">,
  kieli: KaannettavaKieli,
  hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu,
  paatosTyyppi: PaatosTyyppi
): HyvaksymisPaatosVaiheKutsuAdapterProps {
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
    uudelleenKuulutus: hyvaksymisPaatosVaihe.uudelleenKuulutus || undefined,
    suunnitteluSopimus,
    paatosTyyppi,
    viimeinenVoimassaolovuosi: hyvaksymisPaatosVaihe.viimeinenVoimassaolovuosi,
  };
}

export interface HyvaksymisPaatosVaiheKutsuAdapterProps extends CommonKutsuAdapterProps {
  kuulutusPaiva: string;
  kuulutusVaihePaattyyPaiva: string;
  yhteystiedot: Yhteystieto[];
  paatoksenPvm: string;
  asianumero: string;
  hallintoOikeus: HallintoOikeus;
  paatosTyyppi: PaatosTyyppi;
  viimeinenVoimassaolovuosi?: string | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  suunnitteluSopimus?: SuunnitteluSopimus | null;
}

export class HyvaksymisPaatosVaiheKutsuAdapter extends CommonKutsuAdapter {
  readonly props: HyvaksymisPaatosVaiheKutsuAdapterProps;

  constructor(props: HyvaksymisPaatosVaiheKutsuAdapterProps) {
    super(props, "asiakirja.hyvaksymispaatoksesta_ilmoittaminen.");
    this.props = props;
  }

  get kuulutusNahtavillaAika(): string {
    return this.formatDateRange(this.props.kuulutusPaiva, this.props.kuulutusVaihePaattyyPaiva);
  }

  get lain(): string {
    return this.tieRataOptionTextFor("lain");
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

  get kuulutusPaiva(): string {
    return this.props.kuulutusPaiva ? formatDate(this.props.kuulutusPaiva) : "DD.MM.YYYY";
  }

  get kuulutusVaihePaattyyPaiva(): string {
    return this.props.kuulutusVaihePaattyyPaiva ? formatDate(this.props.kuulutusVaihePaattyyPaiva) : "DD.MM.YYYY";
  }

  hallinto_oikeus_genetiivi(): string {
    return this.text("hallinto_oikeus_genetiivi." + this.props.hallintoOikeus);
  }

  kuulutusosoite(): string {
    return this.isVaylaTilaaja() ? "https://www.vayla.fi/kuulutukset" : "https://www.ely-keskus.fi/kuulutukset";
  }

  get linkki_jatkopaatos(): string {
    assertIsDefined(this.oid);
    if (this.props.paatosTyyppi === PaatosTyyppi.JATKOPAATOS1) {
      return super.linkki_jatkopaatos1;
    } else if (this.props.paatosTyyppi === PaatosTyyppi.JATKOPAATOS2) {
      return super.linkki_jatkopaatos2;
    } else {
      return "";
    }
  }

  get viimeinen_voimassaolovuosi(): string | null | undefined {
    return this.props.viimeinenVoimassaolovuosi;
  }

  get laheteTekstiVastaanottajat(): string[] {
    const result: string[] = [];
    const kunnat = this.props.ilmoituksenVastaanottajat?.kunnat;
    const viranomaiset = this.props.ilmoituksenVastaanottajat?.viranomaiset;
    kunnat?.forEach(({ sahkoposti }) => {
      result.push(sahkoposti);
    });
    viranomaiset?.forEach(({ sahkoposti }) => {
      result.push(sahkoposti);
    });
    return result;
  }

  get userInterfaceFields(): KuulutusTekstit | undefined {
    let kappale1;
    const typeKey = this.props.paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS ? 'hyvaksymispaatoksesta' : 'jatkopaatos'
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
      tietosuoja: this.htmlText("asiakirja.tietosuoja", { extLinks: true }),
    };
  }

  get uudelleenKuulutusSeloste(): string | undefined {
    return this.props?.uudelleenKuulutus?.selosteLahetekirjeeseen?.[this.kieli];
  }
}
