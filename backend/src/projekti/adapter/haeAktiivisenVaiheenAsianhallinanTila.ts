import { Vaihe, Projekti, AktiivisenVaiheenAsianhallinnanTila, KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import { statusOrder } from "hassu-common/statusOrder";
import {
  haeJulkaisunTiedot,
  haeVaiheenTiedot,
  julkaisuIsVuorovaikutusKierrosLista,
  vaiheenDataIsVuorovaikutusKierros,
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

export async function haeAktiivisenVaiheenAsianhallinanTila(
  projekti: Projekti
): Promise<AktiivisenVaiheenAsianhallinnanTila | null | undefined> {
  let vaihe = haeEnsimmainenVaiheJokaOdottaaHyvaksyntaaTaiOnMuokkausTilassa(projekti);
  if (!vaihe) {
    return undefined;
  }

  if (vaiheOnSuunnitteluJaPalattuNahtavillaolosta(projekti, vaihe)) {
    vaihe = Vaihe.NAHTAVILLAOLO;
  }

  const asianhallintaEnabled = await isProjektiAsianhallintaIntegrationEnabled(projekti);

  return {
    __typename: "AktiivisenVaiheenAsianhallinnanTila",
    vaihe,
    tila: asianhallintaEnabled ? await asianhallintaService.checkAsianhallintaState(projekti.oid, vaihe) : undefined,
  };
}

function vaiheOnSuunnitteluJaPalattuNahtavillaolosta(projekti: Projekti, vaihe: Vaihe) {
  if (vaihe === Vaihe.SUUNNITTELU) {
    const vaiheenTiedot = haeVaiheenTiedot(projekti, vaihe);
    if (vaiheenDataIsVuorovaikutusKierros(vaiheenTiedot) && vaiheenTiedot.palattuNahtavillaolosta) {
      return true;
    }
  }
  return false;
}

function haeEnsimmainenVaiheJokaOdottaaHyvaksyntaaTaiOnMuokkausTilassa(projekti: Projekti) {
  return Object.values(Vaihe)
    .sort((vaiheA, vaiheB) => statusOrder[vaiheToStatus[vaiheA]] - statusOrder[vaiheToStatus[vaiheB]])
    .find((vaihe) => vaiheOnMuokkausTilassa(projekti, vaihe) || vaiheenJulkaisuOdottaaHyvaksyntaa(projekti, vaihe));
}
