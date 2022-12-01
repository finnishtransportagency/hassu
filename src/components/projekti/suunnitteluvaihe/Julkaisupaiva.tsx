import SectionContent from "@components/layout/SectionContent";
import React, { ReactElement } from "react";
import { today } from "src/util/dateUtils";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { VuorovaikutusFormValues } from "./SuunnitteluvaiheenVuorovaikuttaminen";

export default function Julkaisupaiva(): ReactElement {
  return (
    <SectionContent>
      <h4 className="vayla-small-title">Julkaisupäivä</h4>
      <p>
        Anna päivämäärä, jolloin vuorovaikutusosio palvelun julkisella puolella ja kutsu vuorovaikutukseen muilla ilmoituskanavilla
        julkaistaan.
      </p>
      <HassuDatePickerWithController<VuorovaikutusFormValues>
        className="mt-8"
        label="Julkaisupäivä"
        minDate={today()}
        textFieldProps={{ required: true }}
        controllerProps={{ name: "vuorovaikutusKierros.vuorovaikutusJulkaisuPaiva" }}
      />
    </SectionContent>
  );
}
