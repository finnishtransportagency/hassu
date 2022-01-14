import React, { ReactElement, useState, useEffect } from "react";
import RadioButton from "@components/form/RadioButton";
import TextInput from "@components/form/TextInput";
import Button from "@components/button/Button";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Projekti, SuunnitelmaInput } from "@services/api";
import IconButton from "@components/button/IconButton";
import FormGroup from "@components/form/FormGroup";

const defaultSuunnitelma: SuunnitelmaInput = {
  asiatunnus: "",
  nimi: "",
};

interface Props {
  projekti?: Projekti | null;
}

export default function ProjektiPerustiedot({ projekti }: Props): ReactElement {
  const { register, control } = useFormContext(); // retrieve all hook methods

  const { fields, append, remove } = useFieldArray({
    control,
    name: "liittyvatSuunnitelmat",
  });

  const [isLiittyviaSuunnitelmia, setLiittyviaSuunnitelmia] = useState(false);

  useEffect(() => {
    if (projekti && projekti.oid) {
      setLiittyviaSuunnitelmia(projekti?.liittyvatSuunnitelmat?.length ? true : false);
    }
  }, [projekti]);

  return (
    <>
      <h4 className="vayla-small-title">Projektiin liittyvät suunnitelmat</h4>
      <fieldset>
        <FormGroup label="Liittyykö projektiin muita voimassaolevia läkisääteisiä suunnitelmia" flexDirection="row">
          <RadioButton
            label="Kyllä"
            name="liittyvia_suunnitelmia"
            value="true"
            id="liittyvia_suunnitelmia_kylla"
            onChange={() => setLiittyviaSuunnitelmia(true)}
            checked={isLiittyviaSuunnitelmia}
          />
          <RadioButton
            label="Ei"
            name="liittyvia_suunnitelmia"
            value="false"
            id="liittyvia_suunnitelmia_ei"
            onChange={() => setLiittyviaSuunnitelmia(false)}
            checked={!isLiittyviaSuunnitelmia}
          />
        </FormGroup>
        <div>
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-x-6 mb-3">
              <div className="md:col-span-4">
                <TextInput
                  label="Asiatunnus"
                  {...register(`liittyvatSuunnitelmat.${index}.asiatunnus`)}
                  disabled={!isLiittyviaSuunnitelmia}
                />
              </div>
              <div className="md:col-span-6">
                <TextInput
                  label="Suunnitelman nimi"
                  {...register(`liittyvatSuunnitelmat.${index}.nimi`)}
                  disabled={!isLiittyviaSuunnitelmia}
                />
              </div>
              <div>
                <div className="hidden lg:block lg:mt-6">
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
              </div>
            </div>
          ))}
        </div>
        <Button
          onClick={(event) => {
            event.preventDefault();
            append(defaultSuunnitelma);
          }}
          disabled={!isLiittyviaSuunnitelmia}
        >
          Uusi rivi +
        </Button>
      </fieldset>
    </>
  );
}
