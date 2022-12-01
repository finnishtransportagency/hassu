import { KayttajaTyyppi, ProjektiKayttaja, Yhteystieto } from "@services/api";
import { useMemo } from "react";
import projektiKayttajaToYhteystieto from "src/util/kayttajaTransformationUtil";
import { ProjektiLisatiedolla } from "./useProjekti";

export default function useProjektiHenkilot(projekti: ProjektiLisatiedolla): (Yhteystieto & { kayttajatunnus: string })[] {
  return useMemo(() => {
    const kunnanEdustaja = projekti?.kayttoOikeudet?.find((hlo) => hlo.kayttajatunnus === projekti.suunnitteluSopimus?.yhteysHenkilo);
    const projari = projekti?.kayttoOikeudet?.find((hlo) => hlo.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO);
    const arr: ProjektiKayttaja[] = [];
    if (kunnanEdustaja) {
      arr.push(kunnanEdustaja);
      projekti?.kayttoOikeudet?.forEach((hlo) => {
        if (hlo.kayttajatunnus !== projekti.suunnitteluSopimus?.yhteysHenkilo) {
          arr.push(hlo);
        }
      });
    } else {
      arr.push(projari as ProjektiKayttaja);
      projekti?.kayttoOikeudet?.forEach((hlo) => {
        if (hlo.tyyppi !== KayttajaTyyppi.PROJEKTIPAALLIKKO) {
          arr.push(hlo);
        }
      });
    }
    return arr.map((hlo) => ({ kayttajatunnus: hlo.kayttajatunnus, ...projektiKayttajaToYhteystieto(hlo, projekti?.suunnitteluSopimus) }));
  }, [projekti]);
}
