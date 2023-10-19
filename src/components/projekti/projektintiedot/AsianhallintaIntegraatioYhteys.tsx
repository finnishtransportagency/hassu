import React from "react";
import FormGroup from "@components/form/FormGroup";
import { H4 } from "@components/Headings";
import ContentSpacer from "@components/layout/ContentSpacer";
import Section from "@components/layout/Section2";
import { FormControlLabel, Switch } from "@mui/material";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import { Controller, useFormContext } from "react-hook-form";

type Props = {
  formDisabled: boolean;
};

export default function AsianhallintaIntegraatioYhteys({}: Props) {
  const { control } = useFormContext<FormValues>();
  return (
    <Section>
      <H4>Integraatioyhteys</H4>
      <ContentSpacer>
        <p>
          Järjestelmä mahdollistaa integraation avulla kuulutusten, ilmoitusten, kutsujen ja lähetekirjeiden viemisen automaattisesti
          asianhallintaan. Automaattinen yhteys asianhallintaan on mahdollista ottaa pois päältä. Jos integraatioyhteys on pois päältä,
          käyttäjän tulee itse viedä tiedostot asianhallintaan.
        </p>
        <Controller
          control={control}
          name="estaAsianhallintaIntegraatio"
          render={({ field, fieldState }) => (
            <FormGroup errorMessage={fieldState.error?.message}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!field.value}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    onChange={(_e, checked) => {
                      field.onChange(!checked);
                    }}
                  />
                }
                label={`Integraatioyhteys ${!field.value ? "päällä" : "pois päältä"}`}
              />
            </FormGroup>
          )}
        />
      </ContentSpacer>
    </Section>
  );
}
