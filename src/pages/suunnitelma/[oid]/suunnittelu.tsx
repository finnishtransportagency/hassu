import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { useRouter } from "next/router";

export default function Suunnittelu(): ReactElement {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti } = useProjektiJulkinen(oid);

  return (
    <ProjektiJulkinenPageLayout selectedStep={1} title="Tutustu hankkeeseen ja vuorovaikuta">
      <>
        <Section>Hanke siirtynyt suunnitteluvaiheeseen {projekti?.aloitusKuulutusJulkaisut ? projekti.aloitusKuulutusJulkaisut[0].siirtyySuunnitteluVaiheeseen : ""}</Section>
      </>
    </ProjektiJulkinenPageLayout>
  );
}
