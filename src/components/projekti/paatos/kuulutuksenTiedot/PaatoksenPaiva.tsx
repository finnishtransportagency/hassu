import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React, { useMemo } from "react";
import HassuGrid from "@components/HassuGrid";
import { Link } from "@mui/material";
import TextInput from "@components/form/TextInput";
import { HassuDatePicker } from "@components/form/HassuDatePicker";
import { isValidDate } from "src/util/dateUtils";
import NextLink from "next/link";
import dayjs, { Dayjs } from "dayjs";
import { Hyvaksymispaatos } from "@services/api";

type Props = {
  paatos?: Hyvaksymispaatos | undefined | null;
  projektiOid: string;
};

export default function PaatoksenPaiva({ paatos, projektiOid }: Props) {
  const paatoksenPvm: Dayjs | null = useMemo(() => {
    const dateString = paatos?.paatoksenPvm;
    if (!!dateString && isValidDate(dateString)) {
      return dayjs(dateString);
    } else {
      return null;
    }
  }, [paatos?.paatoksenPvm]);

  return (
    <Section noDivider>
      <SectionContent>
        <h4 className="vayla-small-title">Liikenne- ja viestintäviraston jatkopäätöksen päivä ja asiatunnus</h4>
        <p>
          Liikenne- ja viestintäviraston jatkopäätöksen päivämäärän ja asiantunnus tulee automaattisesti{" "}
          <NextLink passHref href={{ pathname: `/yllapito/projekti/[oid]/kasittelyntila`, query: { oid: projektiOid } }}>
            <Link underline="none">Käsittelyn tila</Link>
          </NextLink>{" "}
          -sivulta.
        </p>
        <HassuGrid cols={{ lg: 3 }}>
          <HassuDatePicker label="Päätöspäivä *" disabled value={paatoksenPvm} />
          <TextInput label="Asianumero *" disabled value={paatos?.asianumero || ""} />
        </HassuGrid>
      </SectionContent>
    </Section>
  );
}
