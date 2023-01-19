import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { MuokkausTila } from "@services/api";
import { useProjekti } from "src/hooks/useProjekti";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { paatosPageLayoutData, PaatosTyyppi } from "src/util/getPaatosSpecificData";

function PaatosIndexPage({ paatosTyyppi }: { paatosTyyppi: PaatosTyyppi }) {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  const router = useRouter();

  const { pageTitle, paatosRoutePart } = useMemo(() => paatosPageLayoutData[paatosTyyppi], [paatosTyyppi]);

  useEffect(() => {
    if (projekti) {
      const isMuokkausTila =
        !projekti.nahtavillaoloVaihe?.muokkausTila || projekti.nahtavillaoloVaihe?.muokkausTila === MuokkausTila.MUOKKAUS;
      const pathname = isMuokkausTila
        ? `/yllapito/projekti/[oid]/${paatosRoutePart}/aineisto`
        : `/yllapito/projekti/[oid]/${paatosRoutePart}/kuulutus`;
      router.push({ query: { oid: projekti.oid }, pathname });
    }
  }, [paatosRoutePart, projekti, router]);

  return (
    <ProjektiPageLayout title={pageTitle}>
      <></>
    </ProjektiPageLayout>
  );
}

export default PaatosIndexPage;
