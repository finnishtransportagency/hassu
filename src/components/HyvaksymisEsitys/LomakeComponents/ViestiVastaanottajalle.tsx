import { TextFieldWithController } from "@components/form/TextFieldWithController";
import { H4, H5 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import { Checkbox, FormControlLabel } from "@mui/material";
import { ReactElement } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";

export default function ViestiVastaanottajalle(): ReactElement {
  const { control } = useFormContext<HyvaksymisEsitysForm>();

  return (
    <SectionContent>
      <H4 variant="h3">Viesti vastaanottajalle</H4>
      <Controller<HyvaksymisEsitysForm>
        name="muokattavaHyvaksymisEsitys.kiireellinen"
        render={({ field: { value, onChange, ...field } }) => (
          <FormControlLabel
            label="Pyydetään kiireellistä käsittelyä"
            control={
              <Checkbox
                checked={!!value}
                onChange={(event) => {
                  const checked = event.target.checked;
                  onChange(!!checked);
                }}
                {...field}
              />
            }
          />
        )}
      />
      <H5 variant="h4">Lisätiedot</H5>
      <p>Lisätieto näkyy vastaanottajalle lähetetyssä sähköpostiviestissä sekä hyväksymisesityksen linkin takana.</p>
      <div>
        <TextFieldWithController
          multiline
          controllerProps={{ control, name: "muokattavaHyvaksymisEsitys.lisatiedot" }}
          inputProps={{ maxLength: 2000 }}
          showCounter
          fullWidth
        />
      </div>
    </SectionContent>
  );
}
