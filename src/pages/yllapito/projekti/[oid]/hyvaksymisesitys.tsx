import HyvaksymisEsitysLomake from "@components/HyvaksymisEsitys/HyvaksymisEsitysLomake";
import HyvaksymisEsitysLukutila from "@components/HyvaksymisEsitys/HyvaksymisEsitysLukutila";
import { HyvaksymisTila } from "@services/api";
import { ReactElement } from "react";
import useHyvaksymisEsitys from "src/hooks/useHyvaksymisEsitys";
import useKayttoOikeudet from "src/hooks/useKayttoOikeudet";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";

export default function HyvaksymisEsitysPage(): ReactElement {
  const { data: hyvaksymisEsityksenTiedot } = useHyvaksymisEsitys();
  const { oid, versio, hyvaksymisEsitys } = hyvaksymisEsityksenTiedot ?? {};
  const { data: nykyinenKayttaja } = useKayttoOikeudet();

  if (!hyvaksymisEsityksenTiedot?.vaiheOnAktiivinen || !versio || !oid) {
    return <></>;
  }

  const muokkaustila =
    !projektiOnEpaaktiivinen(hyvaksymisEsityksenTiedot) &&
    !!nykyinenKayttaja?.omaaMuokkausOikeuden &&
    (!hyvaksymisEsitys || hyvaksymisEsitys.tila === HyvaksymisTila.MUOKKAUS);

  if (muokkaustila) {
    return <HyvaksymisEsitysLomake hyvaksymisEsityksenTiedot={hyvaksymisEsityksenTiedot} />;
  }

  return <HyvaksymisEsitysLukutila hyvaksymisEsityksenTiedot={hyvaksymisEsityksenTiedot} />;
}
