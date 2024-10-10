import { Vaihe, Projekti, AktiivisenVaiheenAsianhallinnanTila, KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import { statusOrder } from "hassu-common/statusOrder";
import {
  haeJulkaisunTiedot,
  julkaisuIsVuorovaikutusKierrosLista,
  vaiheOnMuokkausTilassa,
  vaiheToStatus,
} from "hassu-common/util/haeVaiheidentiedot";
import { asianhallintaService } from "../../asianhallinta/asianhallintaService";
import { isProjektiAsianhallintaIntegrationEnabled } from "../../util/isProjektiAsianhallintaIntegrationEnabled";

function vaiheenJulkaisuOdottaaHyvaksyntaa(projekti: Projekti, vaihe: Vaihe): boolean {
  const julkaisu = haeJulkaisunTiedot(projekti, vaihe);
  if (julkaisuIsVuorovaikutusKierrosLista(julkaisu)) {
    return false;
  } else {
    return julkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA;
  }
}

export async function haeAktiivisenVaiheenAsianhallinnanTila(
  projekti: Projekti
): Promise<AktiivisenVaiheenAsianhallinnanTila | null | undefined> {
  const vaihe = haeEnsimmainenVaiheJokaOdottaaHyvaksyntaaTaiOnMuokkausTilassa(projekti);
  if (!vaihe) {
    return undefined;
  }

  const asianhallintaEnabled = await isProjektiAsianhallintaIntegrationEnabled(projekti);

  return {
    __typename: "AktiivisenVaiheenAsianhallinnanTila",
    vaihe,
    tila: asianhallintaEnabled ? await asianhallintaService.checkAsianhallintaState(projekti.oid, vaihe) : undefined,
  };
}

function haeEnsimmainenVaiheJokaOdottaaHyvaksyntaaTaiOnMuokkausTilassa(projekti: Projekti) {
  return Object.values(Vaihe)
    .filter(suodataSuunnitteluvaiheJosPalattuNahtavillaolostaTaiVahainenMenettely(projekti))
    .sort((vaiheA, vaiheB) => statusOrder(vaiheToStatus[vaiheA]) - statusOrder(vaiheToStatus[vaiheB]))
    .find((vaihe) => vaiheOnMuokkausTilassa(projekti, vaihe) || vaiheenJulkaisuOdottaaHyvaksyntaa(projekti, vaihe));
}

function suodataSuunnitteluvaiheJosPalattuNahtavillaolostaTaiVahainenMenettely(
  projekti: Projekti
): (value: Vaihe, index: number, array: Vaihe[]) => boolean {
  return (vaihe) => vaihe !== Vaihe.SUUNNITTELU || !(projekti.vuorovaikutusKierros?.palattuNahtavillaolosta || projekti.vahainenMenettely);
}
