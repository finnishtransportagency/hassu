import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { Vaihe } from "@services/api";
import { useProjekti } from "src/hooks/useProjekti";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { LAUSUNTOPYYNNOT_ROUTE } from "src/util/routes";

function ProjektiPage() {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  const router = useRouter();

  useEffect(() => {
    if (projekti) {
      const pathname = LAUSUNTOPYYNNOT_ROUTE.pathname;
      router.push({ query: { oid: projekti.oid }, pathname });
    }
  }, [projekti, router]);

  return (
    <ProjektiPageLayout vaihe={Vaihe.NAHTAVILLAOLO} title="Lausuntopyyntöjen aineistolinkit">
      <></>
    </ProjektiPageLayout>
  );
}

export default ProjektiPage;
