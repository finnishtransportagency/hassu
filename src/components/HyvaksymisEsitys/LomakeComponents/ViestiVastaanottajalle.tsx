import { TextFieldWithController } from "@components/form/TextFieldWithController";
import { H4, H5 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import { Checkbox, FormControlLabel } from "@mui/material";
import { ReactElement } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { EnnakkoneuvotteluForm, HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";
import { HyvaksymisEsitysEnnakkoNeuvotteluProps } from "./LinkinVoimassaoloaika";

export default function ViestiVastaanottajalle({ ennakkoneuvottelu }: Readonly<HyvaksymisEsitysEnnakkoNeuvotteluProps>): ReactElement {
  const { control } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  return (
    <SectionContent>
      <H4 variant="h3">Viesti vastaanottajalle</H4>
      {!ennakkoneuvottelu && (
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
      )}
      <H5 variant="h4">Lisätiedot</H5>
      <p>
        {ennakkoneuvottelu
          ? "Lisätieto näkyy vastaanottajalle lähetetyssä sähköpostiviestissä sekä ennakkoneuvottelun linkin takana. Kirjaa kentään esimerkiksi sovittu ennakkoneuvottelun ajankohta."
          : "Lisätieto näkyy vastaanottajalle lähetetyssä sähköpostiviestissä sekä hyväksymisesityksen linkin takana."}
      </p>
      <div>
        <TextFieldWithController
          multiline
          controllerProps={{ control, name: ennakkoneuvottelu ? "ennakkoNeuvottelu.lisatiedot" : "muokattavaHyvaksymisEsitys.lisatiedot" }}
          inputProps={{ maxLength: 2000 }}
          showCounter
          fullWidth
        />
      </div>
    </SectionContent>
  );
}
