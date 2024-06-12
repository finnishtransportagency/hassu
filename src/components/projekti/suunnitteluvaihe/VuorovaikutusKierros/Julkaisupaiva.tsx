import SectionContent from "@components/layout/SectionContent";
import React, { ReactElement } from "react";
import { today } from "hassu-common/util/dateUtils";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { VuorovaikutusFormValues } from ".";

export default function Julkaisupaiva(): ReactElement {
  return (
    <SectionContent>
      <h3 className="vayla-subtitle">Julkaisupäivä</h3>
      <p>
        Anna päivämäärä, jolloin suunnitteluvaiheen tiedot ja kutsu vuorovaikutukseen julkaistaan palvelun julkisella puolella sekä muilla
        ilmoituskanavilla, esim. kunnan verkkosivuilla.
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
