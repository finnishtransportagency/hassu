import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React from "react";
import DatePicker from "@components/form/DatePicker";
import HassuGrid from "@components/HassuGrid";
import { Link } from "@mui/material";
import { Projekti } from "@services/api";
import TextInput from "@components/form/TextInput";

type Props = {
  projekti: Projekti;
};

export default function PaatoksenPaiva({ projekti }: Props) {
  return (
    <Section noDivider>
      <SectionContent>
        <h4 className="vayla-small-title">Liikenne- ja viestintäviraston päätöksen päivä ja asianumero</h4>
        <p>
          Järjestelmän pääkäyttäjä lisää Liikenne- ja viestintäviraston päätöksen päivämäärän ja asianumeron. Kuulutus
          on mahdollista julkaista vasta kun hyväksymispäätös on annettu. Käsittelyn tilaa voi seurata{" "}
          <Link underline="none" href={`/yllapito/projekti/${projekti.oid}/kasittelyntila`}>
            Käsittelyn tila
          </Link>{" "}
          -sivulta.
        </p>
        <HassuGrid cols={{ lg: 3 }}>
          <DatePicker
            label="Päätöspäivä *"
            className="md:max-w-min"
            disabled
            readOnly
            value={projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm || ""}
          />
          <TextInput
            label="Asianumero *"
            disabled
            value={projekti.kasittelynTila?.hyvaksymispaatos?.asianumero || ""}
            readOnly
          />
        </HassuGrid>
      </SectionContent>
    </Section>
  );
}
