import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React, { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import dayjs from "dayjs";
import HassuGrid from "@components/HassuGrid";
import Select from "@components/form/Select";

type Props = {};

type FormFields = {
  jatkoPaatos1Vaihe: {
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

export default function Voimassaolovuosi({}: Props) {
  const {
    register,
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
          <Controller
            control={control}
            name="jatkoPaatos1Vaihe.viimeinenVoimassaolovuosi"
            render={({ field: { value, onChange, ...field } }) => (
              <Select
                id="voimassaolovuosi"
                label="Päätöksen viimeinen voimassaolovuosi *"
                options={
                  years?.map((year) => {
                    return { label: year, value: year };
                  }) || [{ label: "", value: "" }]
                }
                {...register(`jatkoPaatos1Vaihe.viimeinenVoimassaolovuosi`)}
                error={errors?.jatkoPaatos1Vaihe?.viimeinenVoimassaolovuosi}
                addEmptyOption
                value={value || ""}
                onChange={(event) => onChange(event.target.value)}
                {...field}
              />
            )}
          />
        </HassuGrid>
      </SectionContent>
    </Section>
  );
}
