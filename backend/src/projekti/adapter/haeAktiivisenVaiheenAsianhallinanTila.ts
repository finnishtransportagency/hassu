import {
  Vaihe,
  Status,
  Projekti,
  AktiivisenVaiheenAsianhallinanTila,
  AsiakirjaTyyppi,
  KuulutusJulkaisuTila,
} from "hassu-common/graphql/apiModel";
import { vaiheOnMuokkausTilassa } from "hassu-common/vaiheOnMuokkaustilassa";
import { asianhallintaService } from "../../asianhallinta/asianhallintaService";
import { parameters } from "../../aws/parameters";

type HaeStatuksenVaiheFunc = (status: Status) => Vaihe | undefined;

const haeStatuksenVaihe: HaeStatuksenVaiheFunc = (status) => {
  let vaihe: Vaihe | undefined = undefined;
  switch (status) {
    case Status.ALOITUSKUULUTUS:
      vaihe = Vaihe.ALOITUSKUULUTUS;
      break;
    case Status.SUUNNITTELU:
      vaihe = Vaihe.SUUNNITTELU;
      break;
    case Status.NAHTAVILLAOLO:
    case Status.NAHTAVILLAOLO_AINEISTOT:
      vaihe = Vaihe.NAHTAVILLAOLO;
      break;
    case Status.HYVAKSYMISMENETTELYSSA_AINEISTOT:
    case Status.HYVAKSYTTY:
      vaihe = Vaihe.HYVAKSYMISPAATOS;
      break;
    case Status.JATKOPAATOS_1_AINEISTOT:
    case Status.JATKOPAATOS_1:
      vaihe = Vaihe.JATKOPAATOS;
      break;
    case Status.JATKOPAATOS_2_AINEISTOT:
    case Status.JATKOPAATOS_2:
      vaihe = Vaihe.JATKOPAATOS2;
      break;
  }
  return vaihe;
};

const vaiheenAsiakirjaTyyppi: Record<Vaihe, AsiakirjaTyyppi> = {
  ALOITUSKUULUTUS: AsiakirjaTyyppi.ALOITUSKUULUTUS,
  SUUNNITTELU: AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU,
  NAHTAVILLAOLO: AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS,
  HYVAKSYMISPAATOS: AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS,
  JATKOPAATOS: AsiakirjaTyyppi.JATKOPAATOSKUULUTUS,
  JATKOPAATOS2: AsiakirjaTyyppi.JATKOPAATOSKUULUTUS2,
};

type VaiheJulkaisukentta = keyof Pick<
  Projekti,
  | "aloitusKuulutusJulkaisu"
  | "vuorovaikutusKierrosJulkaisut"
  | "nahtavillaoloVaiheJulkaisu"
  | "hyvaksymisPaatosVaiheJulkaisu"
  | "jatkoPaatos1VaiheJulkaisu"
  | "jatkoPaatos2VaiheJulkaisu"
>;

const vaiheidenJulkaisukentat: Record<Vaihe, VaiheJulkaisukentta> = {
  ALOITUSKUULUTUS: "aloitusKuulutusJulkaisu",
  SUUNNITTELU: "vuorovaikutusKierrosJulkaisut",
  NAHTAVILLAOLO: "nahtavillaoloVaiheJulkaisu",
  HYVAKSYMISPAATOS: "hyvaksymisPaatosVaiheJulkaisu",
  JATKOPAATOS: "jatkoPaatos1VaiheJulkaisu",
  JATKOPAATOS2: "jatkoPaatos2VaiheJulkaisu",
};

function vaiheenJulkaisuOdottaaHyvaksyntaa(projekti: Projekti, vaihe: Vaihe): boolean {
  const julkaisu = projekti[vaiheidenJulkaisukentat[vaihe]];
  if (Array.isArray(julkaisu)) {
    return false;
  } else {
    return julkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA;
  }
}

export async function haeAktiivisenVaiheenAsianhallinanTila(
  projekti: Projekti
): Promise<AktiivisenVaiheenAsianhallinanTila | null | undefined> {
  const integraatioInaktiivinen = !projekti.asianhallintaIntegraatio || !(await parameters.isAsianhallintaIntegrationEnabled());
  if (integraatioInaktiivinen) {
    return undefined;
  }
  const vaihe = projekti.status && haeStatuksenVaihe(projekti.status);
  if (!vaihe || (!vaiheOnMuokkausTilassa(projekti, vaihe) && !vaiheenJulkaisuOdottaaHyvaksyntaa(projekti, vaihe))) {
    return undefined;
  }
  const asiakirjaTyyppi = vaiheenAsiakirjaTyyppi[vaihe];
  return {
    __typename: "AktiivisenVaiheenAsianhallinanTila",
    vaihe,
    tila: (await asianhallintaService.checkAsianhallintaState({ oid: projekti.oid, asiakirjaTyyppi }))?.asianTila,
  };
}
