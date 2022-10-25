import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React, { useMemo } from "react";
import HassuGrid from "@components/HassuGrid";
import { Link } from "@mui/material";
import { Projekti } from "@services/api";
import TextInput from "@components/form/TextInput";
import { HassuDatePicker } from "@components/form/HassuDatePicker";
import { isValidDate } from "src/util/dateUtils";
import dayjs, { Dayjs } from "dayjs";

type Props = {
  projekti: Projekti;
};

export default function PaatoksenPaiva({ projekti }: Props) {
  const paatoksenPvm: Dayjs | null = useMemo(() => {
    const dateString = projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm;
    if (!!dateString && isValidDate(dateString)) {
      return dayjs(dateString);
    } else {
      return null;
    }
  }, [projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm]);

  return (
    <Section noDivider>
      <SectionContent>
        <h4 className="vayla-small-title">Liikenne- ja viestintäviraston jatkopäätöksen päivä ja asiatunnus</h4>
        <p>
          Liikenne- ja viestintäviraston jatkopäätöksen päivämäärän ja asiantunnus tulee automaattisesti{" "}
          <Link underline="none" href={`/yllapito/projekti/${projekti.oid}/kasittelyntila`}>
            Käsittelyn tila
          </Link>{" "}
          -sivulta.
        </p>
        <HassuGrid cols={{ lg: 3 }}>
          <HassuDatePicker label="Päätöspäivä *" disabled value={paatoksenPvm} />
          <TextInput label="Asianumero *" disabled value={projekti.kasittelynTila?.hyvaksymispaatos?.asianumero || ""} />
        </HassuGrid>
      </SectionContent>
    </Section>
  );
}
