import SectionContent from "@components/layout/SectionContent";
import React, { ReactElement } from "react";
import { today } from "src/util/dateUtils";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { VuorovaikutusFormValues } from "./SuunnitteluvaiheenVuorovaikuttaminen";

export default function SuunnitteluvaiheenVuorovaikuttaminen(): ReactElement {
  return (
    <>
      <SectionContent>
        <h4 className="vayla-small-title">Julkaisupäivä</h4>
        <p>
          Anna päivämäärä, jolloin vuorovaikutusosio palvelun julkisella puolella ja kutsu vuorovaikutukseen muilla ilmoituskanavilla
          julkaistaan.
        </p>
        <HassuDatePickerWithController<VuorovaikutusFormValues>
          label="Julkaisupäivä"
          minDate={today()}
          textFieldProps={{ required: true }}
          controllerProps={{ name: "vuorovaikutusKierros.vuorovaikutusJulkaisuPaiva" }}
        />
      </SectionContent>
      <SectionContent>
        <h4 className="vayla-small-title">Kysymyksien esittäminen ja palautteiden antaminen</h4>
        <p>Anna päivämäärä, johon mennessä kansalaisten toivotaan esittävän kysymykset ja palautteet.</p>
        <HassuDatePickerWithController<VuorovaikutusFormValues>
          label="Kysymykset ja palautteet viimeistään"
          minDate={today()}
          textFieldProps={{
            required: true,
            sx: { maxWidth: { md: "min-content" } },
          }}
          controllerProps={{ name: "vuorovaikutusKierros.kysymyksetJaPalautteetViimeistaan" }}
        />
      </SectionContent>
    </>
  );
}
