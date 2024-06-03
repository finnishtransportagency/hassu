import React, { ReactElement } from "react";
import { ProjektiKayttajaJulkinen } from "@services/api";
import { formatDate } from "hassu-common/util/dateUtils";
import { H1, H2 } from "@components/Headings";

export default function VanhentunutAineistolinkki({
  poistumisPaiva,
  projarinYhteystiedot,
  suunnitelmanNimi,
  hyvaksymisesitys,
}: Readonly<{
  poistumisPaiva: string | null | undefined;
  projarinYhteystiedot: ProjektiKayttajaJulkinen | null | undefined;
  suunnitelmanNimi: string | null | undefined;
  hyvaksymisesitys?: boolean;
}>): ReactElement {
  return (
    <>
      <H1>Aineistolinkin voimassaolo on päättynyt</H1>
      <H2 variant="lead" className="mt-8 mb-8">
        {suunnitelmanNimi ?? "(Suunnitelman nimi puuttuu)"}
      </H2>
      <div style={{ maxWidth: "40em" }}>
        <p>
          {hyvaksymisesitys ? "Hyväksymisesityksen" : "Lausuntopyynnön"} aineistolinkin voimassaolo on päättynyt{" "}
          <b>{poistumisPaiva ? formatDate(poistumisPaiva) : "virhe: päivämäärä puuttuu"}</b>.
        </p>
        <p>
          Aineistoon liittyvissä tiedusteluissa ja kysymyksissä voit olla yhteydessä projektipäällikköön. Voit pyytää esimerkiksi jatkoa
          aineistolinkin voimassaoloajalle.
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
