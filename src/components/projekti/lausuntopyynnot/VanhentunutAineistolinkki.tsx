import React, { ReactElement } from "react";
import { LadattavatTiedostot, ProjektiJulkinen } from "@services/api";
import { formatDate } from "hassu-common/util/dateUtils";
import { H1, H2 } from "@components/Headings";

export default function VanhentunutAineistolinkki({
  data,
  projekti,
}: {
  data: LadattavatTiedostot;
  projekti: ProjektiJulkinen;
}): ReactElement {
  return (
    <>
      <H1>Aineistolinkin voimassaolo on päättynyt</H1>
      <H2 variant="lead" className="mt-8 mb-8">
        {projekti?.velho.nimi}
      </H2>
      <div style={{ maxWidth: "40em" }}>
        <p>
          Lausuntopyynnön aineistolinkin voimassaolo on päättynyt <b>{formatDate(data.poistumisPaiva)}</b>.
        </p>
        <p>
          Aineistoon liittyvissä tiedusteluissa ja kysymyksissä voit olla yhteydessä projektipäällikköön. Voit pyytää esimerkiksi jatkoa
          aineistolinkin voimassaoloajalle.
        </p>
        <p>Projektipäällikön yhteystiedot:</p>
        <p className="mb-0">
          <strong>
            {data.projektipaallikonYhteystiedot?.etunimi} {data.projektipaallikonYhteystiedot?.sukunimi}
          </strong>
        </p>
        <p>
          <strong>{data.projektipaallikonYhteystiedot?.email}</strong>
        </p>
      </div>
    </>
  );
}
