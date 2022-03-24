import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";

export default function Nahtavillaolo(): ReactElement {
  return (
    <ProjektiJulkinenPageLayout selectedStep={2} title="Tutustu valmiseen suunnitteluaineistoon">
      <>
        <Section></Section>
      </>
    </ProjektiJulkinenPageLayout>
  );
}