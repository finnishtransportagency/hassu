import React, { ReactElement, useEffect, useState } from "react";
import RadioButton from "@components/form/RadioButton";
import TextInput from "@components/form/TextInput";
import Button from "@components/button/Button";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Projekti, SuunnitelmaInput } from "@services/api";
import IconButton from "@components/button/IconButton";
import FormGroup from "@components/form/FormGroup";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import HassuGridItem from "@components/HassuGridItem";
import HassuStack from "@components/layout/HassuStack";

const defaultSuunnitelma: SuunnitelmaInput = {
  asiatunnus: "",
  nimi: "",
};

interface Props {
  projekti?: Projekti | null;
}

export default function ProjektiLiittyvatSuunnitelmat({ projekti }: Props): ReactElement {
  const [isLiittyviaSuunnitelmia, setLiittyviaSuunnitelmia] = useState(false);

  const {
    register,
    formState: { errors },
  } = useFormContext<FormValues>();

  useEffect(() => {
    if (projekti?.oid) {
      setLiittyviaSuunnitelmia(!!projekti?.liittyvatSuunnitelmat?.length);
    }
  }, [projekti]);

  return (
    <Section smallGaps>
      <h4 className="vayla-small-title">Projektiin liittyvät suunnitelmat</h4>
      <FormGroup
        label="Liittyykö projektiin muita voimassaolevia lakisääteisiä suunnitelmia? *"
        flexDirection="row"
        errorMessage={errors?.liittyviasuunnitelmia?.message}
      >
        <RadioButton
          label="Kyllä"
          value="true"
          {...register("liittyviasuunnitelmia")}
          onChange={() => setLiittyviaSuunnitelmia(true)}
        />
        <RadioButton
          label="Ei"
          value="false"
          {...register("liittyviasuunnitelmia")}
          onChange={() => setLiittyviaSuunnitelmia(false)}
        />
      </FormGroup>
      {isLiittyviaSuunnitelmia && (
        <LiittyvatSuunnitelmat isLiittyviaSuunnitelmia={isLiittyviaSuunnitelmia} projekti={projekti} />
      )}
    </Section>
  );
}

interface LiittyvatSuunnitelmatProps {
  isLiittyviaSuunnitelmia: boolean;
  projekti?: Projekti | null;
}

const LiittyvatSuunnitelmat = ({ isLiittyviaSuunnitelmia, projekti }: LiittyvatSuunnitelmatProps) => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext(); // retrieve all hook methods

  const { fields, append, remove } = useFieldArray({
    control,
    name: "liittyvatSuunnitelmat",
  });

  useEffect(() => {
    if (projekti?.oid && !isLiittyviaSuunnitelmia) {
      remove();
    }
  }, [isLiittyviaSuunnitelmia, remove, projekti]);
  return (
    <SectionContent sx={{ marginLeft: 4 }}>
      {fields.map((field, index) => {
        return (
          <HassuGrid key={field.id} cols={{ lg: 3 }}>
            <TextInput
              label="Asiatunnus"
              {...register(`liittyvatSuunnitelmat.${index}.asiatunnus`)}
              disabled={!isLiittyviaSuunnitelmia}
              error={errors?.liittyvatSuunnitelmat?.[index]?.asiatunnus}
              maxLength={30}
            />
            <HassuGridItem colSpan={{ lg: 2 }}>
              <HassuStack direction={{ xs: "column", lg: "row" }} alignItems={{ lg: "flex-end" }}>
                <TextInput
                  label="Suunnitelman nimi"
                  {...register(`liittyvatSuunnitelmat.${index}.nimi`)}
                  disabled={!isLiittyviaSuunnitelmia}
                  error={errors?.liittyvatSuunnitelmat?.[index]?.nimi}
                  style={{ width: "100%" }}
                />
                <div className="hidden lg:block">
                  <IconButton
                    icon="trash"
                    onClick={(event) => {
                      event.preventDefault();
                      remove(index);
                    }}
                  />
                </div>
                <div className="block lg:hidden">
                  <Button
                    onClick={(event) => {
                      event.preventDefault();
                      remove(index);
                    }}
                    endIcon="trash"
                  >
                    Poista
                  </Button>
                </div>
              </HassuStack>
            </HassuGridItem>
          </HassuGrid>
        );
      })}
      <Button
        className="mt-7"
        onClick={(event) => {
          event.preventDefault();
          append(defaultSuunnitelma);
        }}
        disabled={!isLiittyviaSuunnitelmia}
      >
        Uusi rivi +
      </Button>
    </SectionContent>
  );
};
