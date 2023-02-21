import { CommonKutsuAdapter, CommonKutsuAdapterProps } from "./commonKutsuAdapter";
import { DBVaylaUser, HyvaksymisPaatosVaiheJulkaisu, KasittelynTila, Yhteystieto } from "../../database/model";
import { HallintoOikeus, Kieli, KuulutusTekstit } from "../../../../common/graphql/apiModel";
import { assertIsDefined } from "../../util/assertions";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { formatDate } from "../asiakirjaUtil";

export function createHyvaksymisPaatosVaiheKutsuAdapterProps(
  oid: string,
  kayttoOikeudet: DBVaylaUser[],
  kieli: Kieli,
  hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu,
  kasittelynTila: KasittelynTila | null | undefined
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
    kielitiedot: hyvaksymisPaatosVaihe.kielitiedot,
    hankkeenKuvaus: { [Kieli.SUOMI]: "", [Kieli.RUOTSI]: "", [Kieli.SAAME]: "" },
    kuulutusPaiva: hyvaksymisPaatosVaihe.kuulutusPaiva,
    kuulutusVaihePaattyyPaiva: hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva,
    velho: hyvaksymisPaatosVaihe.velho,
    yhteystiedot: hyvaksymisPaatosVaihe.yhteystiedot,
    kayttoOikeudet,
    kieli,
    paatoksenPvm: kasittelynTila.hyvaksymispaatos.paatoksenPvm,
    asianumero: kasittelynTila.hyvaksymispaatos.asianumero,
    hallintoOikeus: hyvaksymisPaatosVaihe.hallintoOikeus,
  };
}

export interface HyvaksymisPaatosVaiheKutsuAdapterProps extends CommonKutsuAdapterProps {
  kuulutusPaiva: string;
  kuulutusVaihePaattyyPaiva: string;
  yhteystiedot: Yhteystieto[];
  paatoksenPvm: string;
  asianumero: string;
  hallintoOikeus: HallintoOikeus;
}

export class HyvaksymisPaatosVaiheKutsuAdapter extends CommonKutsuAdapter {
  private props: HyvaksymisPaatosVaiheKutsuAdapterProps;

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

  kuulutusvaihepaattyypaiva(): string {
    return formatDate(this.props.kuulutusVaihePaattyyPaiva);
  }

  hallinto_oikeus_genetiivi(): string {
    return this.text("hallinto_oikeus_genetiivi." + this.props.hallintoOikeus);
  }

  kuulutusosoite(): string {
    return this.isVaylaTilaaja() ? "https://www.vayla.fi/kuulutukset" : "https://www.ely-keskus.fi/kuulutukset";
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
        this.htmlText("asiakirja.kuulutus_hyvaksymispaatoksesta.kappale2"),
        this.htmlText("asiakirja.kuulutus_hyvaksymispaatoksesta.kappale3"),
        this.htmlText("asiakirja.kuulutus_hyvaksymispaatoksesta.kappale4"),
      ],
      kuvausTekstit: [],
      infoTekstit: [this.htmlText("asiakirja.kuulutus_hyvaksymispaatoksesta.kappale5")],
      tietosuoja: this.htmlText("asiakirja.tietosuoja", { extLinks: true }),
    };
  }
}
