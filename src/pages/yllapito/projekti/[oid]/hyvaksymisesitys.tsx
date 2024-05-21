import HyvaksymisEsitysLomake from "@components/HyvaksymisEsitys/HyvaksymisEsitysLomake";
import HyvaksymisEsitysLukutila from "@components/HyvaksymisEsitys/HyvaksymisEsitysLukutila";
import { HyvaksymisTila } from "@services/api";
import { ReactElement } from "react";
import useHyvaksymisEsitys from "src/hooks/useHyvaksymisEsitys";
import useKayttoOikeudet from "src/hooks/useKayttoOikeudet";

export default function HyvaksymisEsitysPage(): ReactElement {
  const { data: hyvaksymisEsityksenTiedot } = useHyvaksymisEsitys();
  const { oid, versio, hyvaksymisEsitys } = hyvaksymisEsityksenTiedot ?? {};
  const { data: nykyinenKayttaja } = useKayttoOikeudet();

  const muokkaustila = nykyinenKayttaja?.omaaMuokkausOikeuden && (!hyvaksymisEsitys || hyvaksymisEsitys?.tila == HyvaksymisTila.MUOKKAUS);

  return (
    <>
      {hyvaksymisEsityksenTiedot &&
        oid &&
        versio &&
        (muokkaustila ? (
          <HyvaksymisEsitysLomake hyvaksymisEsityksenTiedot={hyvaksymisEsityksenTiedot} />
        ) : (
          <HyvaksymisEsitysLukutila hyvaksymisEsityksenTiedot={hyvaksymisEsityksenTiedot} />
        ))}
    </>
  );
}
