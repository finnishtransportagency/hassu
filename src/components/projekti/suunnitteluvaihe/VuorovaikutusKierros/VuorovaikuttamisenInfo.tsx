import React, { ReactElement } from "react";
import { VuorovaikutusKierros } from "@services/api";

interface Props {
  vuorovaikutus: VuorovaikutusKierros | undefined;
  eiOleJulkaistu: boolean;
}

export default function VuorovaikuttamisenInfo({ eiOleJulkaistu }: Props): ReactElement {
  if (eiOleJulkaistu) {
    return (
      <p className="mb-8">
        Tällä välilehdellä luodaan virallinen kutsu suunnitelman vuorovaikutukseen. Kutsussa näkyy tieto vuorovaikutustilaisuuksista, linkki
        järjestelmän julkisella puolella esiteltäviin suunnitelmaluonnoksiin ja -aineistoihin sekä yhteyshenkilöt.
      </p>
    );
  }

  return <></>;
}
