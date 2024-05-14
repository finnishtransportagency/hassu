import HyvaksymisEsitysLomake from "@components/HyvaksymisEsitys/HyvaksymisEsitysLomake";
import HyvaksymisEsitysLukutila from "@components/HyvaksymisEsitys/HyvaksymisEsitysLukutila";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { HyvaksymisTila, Vaihe } from "@services/api";
import { ReactElement } from "react";
import useHyvaksymisEsitys from "src/hooks/useHyvaksymisEsitys";

export default function HyvaksymisEsitysPage(): ReactElement {
  const { data: hyvaksymisEsityksenTiedot } = useHyvaksymisEsitys();

  const muokkaustila =
    !hyvaksymisEsityksenTiedot?.hyvaksymisEsitys || hyvaksymisEsityksenTiedot?.hyvaksymisEsitys?.tila == HyvaksymisTila.MUOKKAUS;

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
