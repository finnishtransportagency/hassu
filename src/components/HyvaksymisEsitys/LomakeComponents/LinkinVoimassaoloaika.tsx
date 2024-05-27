import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { H4 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import { ReactElement } from "react";

export default function LinkinVoimassaoloaika(): ReactElement {
  return (
    <SectionContent>
      <H4 variant="h3">Linkin voimassaoloaika</H4>
      <p>Valitse hyväksymisesityksenä toimitettavalle suunnitelmalle voimassaoloaika. Voimassaoloaikaa voi muuttaa jälkikäteen.</p>
      <div>
        <HassuDatePickerWithController
          label="Voimassaoloaika päättyy"
          controllerProps={{
            name: `muokattavaHyvaksymisEsitys.poistumisPaiva`,
          }}
          onChange={(date) => {
            if (date?.isValid()) {
              date.format("YYYY-MM-DD");
            }
          }}
        />
      </div>
    </SectionContent>
  );
}
