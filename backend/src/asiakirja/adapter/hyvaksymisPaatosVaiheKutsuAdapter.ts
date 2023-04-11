import { CommonKutsuAdapter, CommonKutsuAdapterProps } from "./commonKutsuAdapter";
import {
  DBVaylaUser,
  EuRahoitusLogot,
  HyvaksymisPaatosVaiheJulkaisu,
  IlmoituksenVastaanottajat,
  KasittelynTila,
  SuunnitteluSopimus,
  UudelleenKuulutus,
  Yhteystieto,
} from "../../database/model";
import { HallintoOikeus, Kieli, KuulutusTekstit } from "../../../../common/graphql/apiModel";
import { assertIsDefined } from "../../util/assertions";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { formatDate } from "../asiakirjaUtil";
import { KaannettavaKieli } from "../../../../common/kaannettavatKielet";

export function createHyvaksymisPaatosVaiheKutsuAdapterProps(
  oid: string,
  lyhytOsoite: string | undefined | null,
  kayttoOikeudet: DBVaylaUser[],
  kieli: KaannettavaKieli,
  hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu,
  kasittelynTila: KasittelynTila | null | undefined,
  euRahoitusLogot?: EuRahoitusLogot | null,
  suunnitteluSopimus?: SuunnitteluSopimus
): HyvaksymisPaatosVaiheKutsuAdapterProps {
  assertIsDefined(kasittelynTila, "kasittelynTila puuttuu");
  assertIsDefined(kasittelynTila.hyvaksymispaatos?.paatoksenPvm, "kasittelynTila.hyvaksymispaatos.paatoksenPvm puuttuu");
  assertIsDefined(kasittelynTila.hyvaksymispaatos?.asianumero, "kasittelynTila.hyvaksymispaatos.asianumero puuttuu");
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
    paatoksenPvm: kasittelynTila.hyvaksymispaatos.paatoksenPvm,
    asianumero: kasittelynTila.hyvaksymispaatos.asianumero,
    hallintoOikeus: hyvaksymisPaatosVaihe.hallintoOikeus,
    euRahoitusLogot,
    ilmoituksenVastaanottajat: hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat,
    uudelleenKuulutus: hyvaksymisPaatosVaihe.uudelleenKuulutus || undefined,
    suunnitteluSopimus,
  };
}

export interface HyvaksymisPaatosVaiheKutsuAdapterProps extends CommonKutsuAdapterProps {
  kuulutusPaiva: string;
  kuulutusVaihePaattyyPaiva: string;
  yhteystiedot: Yhteystieto[];
  paatoksenPvm: string;
  asianumero: string;
  hallintoOikeus: HallintoOikeus;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  suunnitteluSopimus?: SuunnitteluSopimus;
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

  kuulutuspaiva(): string {
    return formatDate(this.props.kuulutusPaiva);
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

    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      kappale1 = this.htmlText("asiakirja.kuulutus_hyvaksymispaatoksesta.tie_kappale1");
    } else if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      kappale1 = this.htmlText("asiakirja.kuulutus_hyvaksymispaatoksesta.rata_kappale1");
    } else {
      return undefined;
    }

    return {
      __typename: "KuulutusTekstit",
      leipaTekstit: [
        kappale1,
        this.htmlText("asiakirja.kuulutus_hyvaksymispaatoksesta.kappale2_ui"),
        this.htmlText("asiakirja.kuulutus_hyvaksymispaatoksesta.kappale3"),
        this.htmlText("asiakirja.kuulutus_hyvaksymispaatoksesta.kappale4"),
      ],
      kuvausTekstit: [],
      infoTekstit: [this.htmlText("asiakirja.kuulutus_hyvaksymispaatoksesta.kappale5")],
      tietosuoja: this.htmlText("asiakirja.tietosuoja", { extLinks: true }),
    };
  }

  get uudelleenKuulutusSeloste(): string | undefined {
    if (this.props.uudelleenKuulutus?.selosteLahetekirjeeseen) {
      return this.props?.uudelleenKuulutus?.selosteLahetekirjeeseen[this.kieli];
    }
  }
}
