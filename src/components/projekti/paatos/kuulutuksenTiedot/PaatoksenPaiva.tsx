import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React, { useMemo } from "react";
import HassuGrid from "@components/HassuGrid";
import TextInput from "@components/form/TextInput";
import { HassuDatePicker } from "@components/form/HassuDatePicker";
import { isValidDate } from "hassu-common/util/dateUtils";
import dayjs, { Dayjs } from "dayjs";
import { Hyvaksymispaatos } from "@services/api";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import StyledLink from "@components/StyledLink";

type Props = {
  paatos?: Hyvaksymispaatos | undefined | null;
  projektiOid: string;
  paatosTyyppi: PaatosTyyppi;
};

export default function PaatoksenPaiva({ paatos, paatosTyyppi, projektiOid }: Props) {
  const paatoksenPvm: Dayjs | null = useMemo(() => {
    const dateString = paatos?.paatoksenPvm;
    if (!!dateString && isValidDate(dateString)) {
      return dayjs(dateString);
    } else {
      return null;
    }
  }, [paatos?.paatoksenPvm]);

  const isHyvaksymisPaatos = paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS;
  const paatosGenetiivi = isHyvaksymisPaatos ? "päätöksen" : "jatkopäätöksen";

  return (
    <Section noDivider>
      <SectionContent>
        <h3 className="vayla-subtitle">Liikenne- ja viestintäviraston {paatosGenetiivi} päivä ja asiatunnus</h3>
        <p>
          {isHyvaksymisPaatos ? (
            <>
              Järjestelmän pääkäyttäjä tai projektipäällikkö lisää Liikenne- ja viestintäviraston päätöksen päivämäärän ja asiatunnuksen.
              Kuulutus on mahdollista julkaista vasta, kun hyväksymispäätös on annettu. Käsittelyn tilaa voi seurata{" "}
            </>
          ) : (
            <>Liikenne- ja viestintäviraston jatkopäätöksen päivämäärän ja asiatunnus tulee automaattisesti </>
          )}
          <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/kasittelyntila`, query: { oid: projektiOid } }}>
            Käsittelyn tila
          </StyledLink>{" "}
          -sivulta.
        </p>
        <HassuGrid cols={{ lg: 3 }}>
          <HassuDatePicker label={isHyvaksymisPaatos ? "Päätöspäivä *" : "Jatkopäätöksen päivä *"} disabled value={paatoksenPvm} />
          <TextInput label="Asiatunnus *" disabled value={paatos?.asianumero || ""} />
        </HassuGrid>
      </SectionContent>
    </Section>
  );
}
