import HyvaksymisEsitysLomake from "@components/HyvaksymisEsitys/HyvaksymisEsitysLomake";
import HyvaksymisEsitysLukutila from "@components/HyvaksymisEsitys/HyvaksymisEsitysLukutila";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { HyvaksymisTila, Vaihe } from "@services/api";
import { ReactElement } from "react";
import useHyvaksymisEsitys from "src/hooks/useHyvaksymisEsitys";
import useKayttoOikeudet from "src/hooks/useKayttoOikeudet";

export default function HyvaksymisEsitysPage(): ReactElement {
  const { data: hyvaksymisEsityksenTiedot } = useHyvaksymisEsitys();
  const { data: nykyinenKayttaja } = useKayttoOikeudet();

  const muokkaustila =
    nykyinenKayttaja?.omaaMuokkausOikeuden &&
    (!hyvaksymisEsityksenTiedot?.hyvaksymisEsitys || hyvaksymisEsityksenTiedot?.hyvaksymisEsitys?.tila == HyvaksymisTila.MUOKKAUS);

  return (
    <>
      {hyvaksymisEsityksenTiedot && (
        // TODO: Uusi oma vaihe Hyväksymisesitykselle(?), ja vaihda alta vaihe vastaavaksi
        <ProjektiPageLayout title="Hyväksymisesitys" vaihe={Vaihe.HYVAKSYMISPAATOS} showInfo={muokkaustila}>
          {muokkaustila ? (
            <HyvaksymisEsitysLomake hyvaksymisEsityksenTiedot={hyvaksymisEsityksenTiedot} />
          ) : (
            <HyvaksymisEsitysLukutila hyvaksymisEsityksenTiedot={hyvaksymisEsityksenTiedot} />
          )}
        </ProjektiPageLayout>
      )}
    </>
  );
}
