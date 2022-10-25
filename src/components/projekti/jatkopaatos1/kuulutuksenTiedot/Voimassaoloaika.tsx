import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React from "react";
import { useFormContext } from "react-hook-form";
import dayjs from "dayjs";
import HassuGrid from "@components/HassuGrid";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";

type Props = {};

type FormFields = {
  jatkoPaatos1Vaihe: {
    voimassaoloaika: string | null; //TODO: tietomalli ja backend
  };
};

export default function Voimassaoloaika({}: Props) {
  const {} = useFormContext<FormFields>();

  return (
    <Section>
      <SectionContent>
        <h4 className="vayla-small-title">Päätöksen voimassaoloaika</h4>
        <p>Valitse pudotusvalikosta vuosi, jonka loppuun saakka päätöksen voimassaoloaikaa jatketaan.</p>
        <HassuGrid cols={{ lg: 3 }}>
          <HassuDatePickerWithController
            label="Päätöksen viimeinen voimassaolovuosi"
            minDate={dayjs().startOf("day")}
            textFieldProps={{ required: true }}
            controllerProps={{
              name: "jatkoPaatos1Vaihe.jatkoPaatos1Vaihe",
            }}
            views={["year"]}
          />
        </HassuGrid>
      </SectionContent>
    </Section>
  );
}
