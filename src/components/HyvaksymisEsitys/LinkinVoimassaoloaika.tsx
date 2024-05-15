import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import SectionContent from "@components/layout/SectionContent";
import { ReactElement } from "react";

export default function LinkinVoimassaoloaika(): ReactElement {
  return (
    <SectionContent>
      <h3 className="vayla-subtitle">Linkin voimassaoloaika</h3>
      <p>Valitse hyväksymisesitksenä toimitettavalle...</p>
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
    </SectionContent>
  );
}
