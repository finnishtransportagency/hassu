import { Vaihe, Status, Projekti, AktiivisenVaiheenAsianhallinnanTila, KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import { haeJulkaisunTiedot, julkaisuIsVuorovaikutusKierrosLista, vaiheOnMuokkausTilassa } from "hassu-common/util/haeVaiheidentiedot";
import { asianhallintaService } from "../../asianhallinta/asianhallintaService";

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

function vaiheenJulkaisuOdottaaHyvaksyntaa(projekti: Projekti, vaihe: Vaihe): boolean {
  const julkaisu = haeJulkaisunTiedot(projekti, vaihe);
  if (julkaisuIsVuorovaikutusKierrosLista(julkaisu)) {
    return false;
  } else {
    return julkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA;
  }
}

export async function haeAktiivisenVaiheenAsianhallinanTila(
  projekti: Projekti
): Promise<AktiivisenVaiheenAsianhallinnanTila | null | undefined> {
  const vaihe = projekti.status && haeStatuksenVaihe(projekti.status);
  if (!vaihe) {
    return undefined;
  }

  const haeAsianhallinnanTila =
    !projekti.asianhallinta?.inaktiivinen &&
    (vaiheOnMuokkausTilassa(projekti, vaihe) || vaiheenJulkaisuOdottaaHyvaksyntaa(projekti, vaihe));

  return {
    __typename: "AktiivisenVaiheenAsianhallinnanTila",
    vaihe,
    tila: haeAsianhallinnanTila ? await asianhallintaService.checkAsianhallintaState(projekti.oid, vaihe) : undefined,
  };
}
