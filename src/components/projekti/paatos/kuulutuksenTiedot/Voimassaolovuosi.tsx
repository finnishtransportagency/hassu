import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import dayjs from "dayjs";
import HassuGrid from "@components/HassuGrid";
import HassuMuiSelect from "@components/form/HassuMuiSelect";
import { MenuItem } from "@mui/material";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";

type FormFields = {
  jatkoPaatos1Vaihe: {
    viimeinenVoimassaolovuosi: string | null;
  };
  jatkoPaatos2Vaihe: {
    viimeinenVoimassaolovuosi: string | null;
  };
};

function getYears(count: number) {
  let years = 0;
  let yearsArray = [];
  while (years < count) {
    const year = dayjs().add(years, "year").year().toString();
    yearsArray.push(year);
    years++;
  }
  return yearsArray;
}

type Props = {
  paatosTyyppi: PaatosTyyppi;
};

export default function Voimassaolovuosi({ paatosTyyppi }: Props) {
  const {
    formState: { errors },
    control,
  } = useFormContext<FormFields>();
  const [years, setYears] = useState<string[]>([]);

  useEffect(() => {
    setYears(getYears(6));
  }, []);

  return (
    <Section>
      <SectionContent>
        <h4 className="vayla-small-title">Päätöksen voimassaoloaika</h4>
        <p>Valitse pudotusvalikosta vuosi, jonka loppuun saakka päätöksen voimassaoloaikaa jatketaan.</p>
        <HassuGrid cols={{ lg: 3 }}>
          <HassuMuiSelect
            label="Päätöksen viimeinen voimassaolovuosi *"
            control={control}
            defaultValue=""
            name={
              paatosTyyppi === PaatosTyyppi.JATKOPAATOS1
                ? "jatkoPaatos1Vaihe.viimeinenVoimassaolovuosi"
                : "jatkoPaatos2Vaihe.viimeinenVoimassaolovuosi"
            }
            error={
              paatosTyyppi === PaatosTyyppi.JATKOPAATOS1
                ? errors?.jatkoPaatos1Vaihe?.viimeinenVoimassaolovuosi
                : errors?.jatkoPaatos2Vaihe?.viimeinenVoimassaolovuosi
            }
          >
            {years.map((year) => {
              return (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              );
            })}
          </HassuMuiSelect>
        </HassuGrid>
      </SectionContent>
    </Section>
  );
}
