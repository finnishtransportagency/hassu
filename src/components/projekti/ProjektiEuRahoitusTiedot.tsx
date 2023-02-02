import React, { ReactElement, useEffect, useState } from "react";
import RadioButton from "@components/form/RadioButton";
import { Controller, useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import Section from "@components/layout/Section";
import { Projekti } from "../../../common/graphql/apiModel";

interface Props {
  projekti?: Projekti | null;
}
export default function ProjektiEuRahoitusTiedot({ projekti }: Props): ReactElement {
  const {
    formState: { errors },
    control,
  } = useFormContext<FormValues>();

  const [hasEuRahoitus, setHasEuRahoitus] = useState(false);
  //const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  console.log(hasEuRahoitus);
  //console.log(logoUrl);
  useEffect(() => {
    setHasEuRahoitus(!!projekti?.euRahoitus);
    //setLogoUrl(projekti?.euRahoitus?.logo || undefined);
  }, [projekti, setHasEuRahoitus]);

  return (
    <Section smallGaps>
      <h4 className="vayla-small-title">EU-rahoitus</h4>
      <Controller
        control={control}
        name="euRahoitus"
        render={({ field: { onBlur, value, ref, name } }) => (
          <FormGroup label="Rahoittaako EU suunnitteluhanketta? *" errorMessage={errors?.euRahoitus?.message} flexDirection="row">
            <RadioButton
              label="Kyllä"
              onBlur={onBlur}
              name={name}
              value="true"
              onChange={() => {
                setHasEuRahoitus(true);
              }}
              checked={value === true}
              ref={ref}
            />
            <RadioButton
              label="Ei"
              onBlur={onBlur}
              name={name}
              value="false"
              onChange={() => {
                setHasEuRahoitus(false);
              }}
              checked={value === false}
              ref={ref}
            />
          </FormGroup>
        )}
      />
    </Section>
  );
}
