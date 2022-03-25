import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";

export default function Hyvaksymispaatos(): ReactElement {
  return (
    <ProjektiJulkinenPageLayout selectedStep={4} title="Tietoa suunnitelmaan liittyvasta hyvaksymispaatoksesta">
      <>
        <Section></Section>
      </>
    </ProjektiJulkinenPageLayout>
  );
}