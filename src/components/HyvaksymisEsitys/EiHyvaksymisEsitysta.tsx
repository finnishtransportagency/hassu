import React, { ReactElement } from "react";
import { ProjektiKayttajaJulkinen } from "@services/api";
import { H1, H2 } from "@components/Headings";

export default function EiHyvaksymisEsitysta({
  projarinYhteystiedot,
  suunnitelmanNimi,
}: Readonly<{
  projarinYhteystiedot: ProjektiKayttajaJulkinen | null | undefined;
  suunnitelmanNimi: string | null | undefined;
}>): ReactElement {
  return (
    <>
      <H1>Hyväksymisesitystä ei ole vielä laadittu</H1>
      <H2 variant="lead" className="mt-8 mb-8">
        {suunnitelmanNimi ?? "(Suunnitelman nimi puuttuu)"}
      </H2>
      <div style={{ maxWidth: "40em" }}>
        <p>
          Hyväksyksymisesityksen aineistolinkki ei ole vielä käytössä. Jos olet saanut aineistolinkin ennenaikaisesti, ota yhteys
          projektipäällikköön. Mikäli olet projektityöntekijä, muistathan, että aineistolinkki on jaettavissa ja käytettävissä vasta, kun
          projektipäällikkö on hyväksynyt hyväksymisesityksen.
        </p>
        <p>Projektipäällikön yhteystiedot:</p>
        {projarinYhteystiedot ? (
          <>
            <p className="mb-0">
              <strong>
                {projarinYhteystiedot?.etunimi} {projarinYhteystiedot?.sukunimi}
              </strong>
            </p>
            <p>
              <strong>{projarinYhteystiedot?.email}</strong>
            </p>
          </>
        ) : (
          <p>(puuttuvat)</p>
        )}
      </div>
    </>
  );
}
