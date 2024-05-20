import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import TextInput from "@components/form/TextInput";
import SectionContent from "@components/layout/SectionContent";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { ReactElement } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

export default function Vastaanottajat(): ReactElement {
  const { control, register } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const { fields, remove, append } = useFieldArray({ name: "muokattavaHyvaksymisEsitys.vastaanottajat", control });

  return (
    <SectionContent>
      <h3 className="vayla-subtitle">Hyväksymisesityksen vastaanottajat</h3>

      {fields.map((field, index) => (
        <div key={field.id}>
          <TextInput
            label="Sähköpostiosoite"
            {...register(`muokattavaHyvaksymisEsitys.vastaanottajat.${index}.sahkoposti`, { shouldUnregister: true })}
          />
          {!!index && (
            <IconButton
              type="button"
              onClick={() => {
                remove(index);
              }}
              icon="trash"
            />
          )}
        </div>
      ))}
      <Button
        onClick={(event) => {
          event.preventDefault();
          append({ sahkoposti: "" });
        }}
        type="button"
        id="lisaa_uusi_vastaanottaja"
      >
        Lisää uusi +
      </Button>
    </SectionContent>
  );
}
