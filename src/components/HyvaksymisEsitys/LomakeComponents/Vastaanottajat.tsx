import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import SectionContent from "@components/layout/SectionContent";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { ReactElement } from "react";
import { Controller, useFormContext } from "react-hook-form";

export default function Vastaanottajat(): ReactElement {
  const { control, watch, setValue } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const vastaanottajat = watch("muokattavaHyvaksymisEsitys.vastaanottajat");

  return (
    <SectionContent>
      <h3 className="vayla-subtitle">Hyväksymisesityksen vastaanottajat</h3>

      {(vastaanottajat?.length ? vastaanottajat : [""]).map((_vastaanottaja, index) => (
        <Controller
          key={index}
          control={control}
          name={`muokattavaHyvaksymisEsitys.vastaanottajat.${index}`}
          render={({ field }) => <TextInput label="Sähköpostiosoite" {...field} />}
        />
      ))}
      <Button
        onClick={(event) => {
          event.preventDefault();
          setValue("muokattavaHyvaksymisEsitys.vastaanottajat", (vastaanottajat ?? []).concat([""]));
        }}
        type="button"
        id="lisaa_uusi_vastaanottaja"
      >
        Lisää uusi +
      </Button>
    </SectionContent>
  );
}
