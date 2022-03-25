import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";

export default function Hyvaksynnassa(): ReactElement {
  return (
    <ProjektiJulkinenPageLayout selectedStep={3} title="Suunnitelma odottaa hyväksyntäpäätöstä">
      <>
        <Section></Section>
      </>
    </ProjektiJulkinenPageLayout>
  );
}