import React from "react";
import FormGroup from "@components/form/FormGroup";
import ContentSpacer from "@components/layout/ContentSpacer";
import Section from "@components/layout/Section2";
import { FormControlLabel, Switch } from "@mui/material";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import { Controller, useFormContext } from "react-hook-form";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { H3 } from "../../Headings";

type Props = {
  formDisabled: boolean;
  projekti: ProjektiLisatiedolla;
};

export default function AsianhallintaIntegraatioYhteys(props: Props) {
  return (
    <Section>
      <H3>Integraatioyhteys</H3>
      <ContentSpacer>
        <p>
          Järjestelmä mahdollistaa integraation avulla kuulutusten, ilmoitusten, kutsujen ja lähetekirjeiden viemisen automaattisesti
          asianhallintaan. Automaattinen yhteys asianhallintaan on mahdollista ottaa pois päältä. Jos integraatioyhteys on pois päältä,
          käyttäjän tulee itse viedä tiedostot asianhallintaan.
        </p>
        {props.projekti.asianhallinta.aktivoitavissa ? <AshaIntegraatioYhteys {...props} /> : <DisabledIntegraatioYhteys />}
      </ContentSpacer>
    </Section>
  );
}

function DisabledIntegraatioYhteys() {
  return (
    <FormGroup>
      <FormControlLabel
        control={<Switch name="asianhallinta.inaktiivinen" disabled checked={false} />}
        label={`Integraatioyhteys pois päältä`}
      />
    </FormGroup>
  );
}

function AshaIntegraatioYhteys({ formDisabled }: Props) {
  const { control } = useFormContext<FormValues>();
  return (
    <Controller
      control={control}
      name="asianhallinta.inaktiivinen"
      render={({ field, fieldState }) => (
        <FormGroup errorMessage={fieldState.error?.message}>
          <FormControlLabel
            control={
              <Switch
                disabled={formDisabled}
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
  );
}
