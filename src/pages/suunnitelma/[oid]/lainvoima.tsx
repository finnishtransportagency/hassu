import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";

export default function Lainvoima(): ReactElement {
  return (
    <ProjektiJulkinenPageLayout selectedStep={5} title="Suunnitelman lainvoimaisuus">
      <>
        <Section></Section>
      </>
    </ProjektiJulkinenPageLayout>
  );
}