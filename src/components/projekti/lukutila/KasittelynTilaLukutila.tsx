import React, { ReactElement } from "react";
import Section from "@components/layout/Section";
import HassuGrid from "@components/HassuGrid";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";

interface Props {
  projekti: ProjektiLisatiedolla;
}

export default function KasittelyntilaPageContent({ projekti }: Props): ReactElement {
  return (
    <Section noDivider>
      <p>
        Pääkäyttäjä lisää sivulle tietoa suunnitelman hallinnollisellisen käsittelyn tiloista, jotka ovat nähtävissä lukutilassa muille
        järjestelmän käyttäjille. Tiedot siirtyvät Käsittelyn tila -sivulta Projektivelhoon.
      </p>
      <Section>
        <h5 className="vayla-small-title mb-10">Hyväksymispäätös</h5>
        <HassuGrid cols={{ lg: 3 }}>
          <div>
            <h5 style={{ fontWeight: "bold" }}>Päätöksen päivä</h5>
            <p>{projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm}</p>
          </div>
          <div>
            <h5 style={{ fontWeight: "bold" }}>Asiatunnus</h5>
            <p>{projekti.kasittelynTila?.hyvaksymispaatos?.asianumero}</p>
          </div>
        </HassuGrid>
      </Section>
      <Section>
        <h5 className="vayla-small-title mb-10">Jatkopäätös</h5>
        <HassuGrid cols={{ lg: 3 }}>
          <div>
            <h5 style={{ fontWeight: "bold" }}>1. jatkopäätöksen päivä</h5>
            <p>{projekti.kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm || "-"}</p>
          </div>
          <div>
            <h5 style={{ fontWeight: "bold" }}>Asiatunnus</h5>
            <p>{projekti.kasittelynTila?.ensimmainenJatkopaatos?.asianumero || "-"}</p>
          </div>
        </HassuGrid>
        <HassuGrid cols={{ lg: 3 }}>
          <div>
            <h5 style={{ fontWeight: "bold" }}>2. jatkopäätöksen päivä</h5>
            <p>{projekti.kasittelynTila?.toinenJatkopaatos?.paatoksenPvm || "-"}</p>
          </div>
          <div>
            <h5 style={{ fontWeight: "bold" }}>Asiatunnus</h5>
            <p>{projekti.kasittelynTila?.toinenJatkopaatos?.asianumero || "-"}</p>
          </div>
        </HassuGrid>
      </Section>
    </Section>
  );
}
