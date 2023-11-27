import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { Vaihe } from "@services/api";
import { useProjekti } from "src/hooks/useProjekti";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";

function ProjektiPage() {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  const router = useRouter();

  useEffect(() => {
    if (projekti) {
      const pathname = "/yllapito/projekti/[oid]/nahtavillaolo/lausuntopyynto/lausuntopyynto";
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
