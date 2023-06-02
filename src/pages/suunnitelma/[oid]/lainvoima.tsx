import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import { Status } from "@services/api";

export default function Lainvoima(): ReactElement {
  return (
    <ProjektiJulkinenPageLayout selectedStep={Status.HYVAKSYTTY} title="Suunnitelman lainvoimaisuus">
      <>
        <Section></Section>
      </>
    </ProjektiJulkinenPageLayout>
  );
}
