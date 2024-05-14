import HyvaksymisEsitysLomake from "@components/HyvaksymisEsitys/HyvaksymisEsitysLomake";
import HyvaksymisEsitysLukutila from "@components/HyvaksymisEsitys/HyvaksymisEsitysLukutila";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { HyvaksymisTila, NykyinenKayttaja, Vaihe, apiConfig } from "@services/api";
import { useRouter } from "next/router";
import { ReactElement, useCallback } from "react";
import useApi from "src/hooks/useApi";
import useCurrentUser from "src/hooks/useCurrentUser";
import useSWR from "swr";

export default function HyvaksymisEsitysPage(): ReactElement {
  const api = useApi();
  const router = useRouter();
  const oid = router.query.oid;
  const { data: kayttaja } = useCurrentUser();
  const hyvaksymisEsitysLoader = useCallback(
    async (_query: string, oid: string | undefined, kayttaja: NykyinenKayttaja | undefined) => {
      if (!oid) {
        return null;
      }
      if (!kayttaja) {
        return null;
      }
      return await api.haeHyvaksymisEsityksenTiedot(oid);
    },
    [api]
  );
  const { data: hyvaksymisEsityksenTiedot } = useSWR(
    [apiConfig.haeHyvaksymisEsityksenTiedot.graphql, oid, kayttaja],
    hyvaksymisEsitysLoader
  );

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
