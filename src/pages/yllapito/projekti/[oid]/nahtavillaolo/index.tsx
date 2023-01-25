import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { MuokkausTila } from "@services/api";
import { useProjekti } from "src/hooks/useProjekti";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";

function ProjektiPage() {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  const router = useRouter();

  useEffect(() => {
    if (projekti) {
      const isMuokkausTila =
        !projekti.nahtavillaoloVaihe?.muokkausTila || projekti.nahtavillaoloVaihe?.muokkausTila === MuokkausTila.MUOKKAUS;
      const pathname = isMuokkausTila
        ? "/yllapito/projekti/[oid]/nahtavillaolo/aineisto"
        : "/yllapito/projekti/[oid]/nahtavillaolo/kuulutus";
      router.push({ query: { oid: projekti.oid }, pathname });
    }
  }, [projekti, router]);

  return (
    <ProjektiPageLayout title="Nähtävilläolovaihe">
      <></>
    </ProjektiPageLayout>
  );
}

export default ProjektiPage;
