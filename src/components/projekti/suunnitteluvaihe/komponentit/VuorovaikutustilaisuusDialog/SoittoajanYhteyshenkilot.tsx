import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import HassuStack from "@components/layout/HassuStack";
import SectionContent from "@components/layout/SectionContent";
import { YhteystietoInput } from "@services/api";
import { ReactElement } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { maxPhoneLength } from "hassu-common/schema/puhelinNumero";
import { VuorovaikutustilaisuusFormValues } from ".";

const defaultYhteystieto: YhteystietoInput = {
  etunimi: "",
  sukunimi: "",
  organisaatio: "",
  puhelinnumero: "",
  sahkoposti: "",
};

interface Props {
  tilaisuusIndex: number;
  disabled?: boolean | null;
}
export default function SoittoajanYhteyshenkilot({ tilaisuusIndex, disabled }: Props): ReactElement {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<VuorovaikutustilaisuusFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `vuorovaikutusTilaisuudet.${tilaisuusIndex}.esitettavatYhteystiedot.yhteysTiedot`,
  });

  return (
    <>
      <SectionContent>
        <p>
          <b>Uusi yhteystieto</b>
        </p>
        <p>
          Lisää uudelle yhteystiedolle rivi Lisää uusi -painikkeella. Huomioi, että uusi yhteystieto ei tallennu Projektin henkilöt -sivulle
          eikä henkilölle tule käyttöoikeuksia projektiin.
        </p>
      </SectionContent>
      {fields.map((field, index) => (
        <HassuStack key={field.id} direction={["column", "column", "row"]}>
          <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 3]}>
            <TextInput
              label="Etunimi *"
              {...register(`vuorovaikutusTilaisuudet.${tilaisuusIndex}.esitettavatYhteystiedot.yhteysTiedot.${index}.etunimi`)}
              error={(errors as any)?.vuorovaikutusTilaisuudet?.[tilaisuusIndex]?.esitettavatYhteystiedot?.[index]?.etunimi}
              disabled={!!disabled}
            />
            <TextInput
              label="Sukunimi *"
              {...register(`vuorovaikutusTilaisuudet.${tilaisuusIndex}.esitettavatYhteystiedot.yhteysTiedot.${index}.sukunimi`)}
              error={(errors as any)?.vuorovaikutusTilaisuudet?.[tilaisuusIndex]?.esitettavatYhteystiedot?.[index]?.sukunimi}
              disabled={!!disabled}
            />
            <TextInput
              label="Organisaatio / kunta *"
              {...register(`vuorovaikutusTilaisuudet.${tilaisuusIndex}.esitettavatYhteystiedot.yhteysTiedot.${index}.organisaatio`)}
              error={(errors as any)?.vuorovaikutusTilaisuudet?.[tilaisuusIndex]?.esitettavatYhteystiedot?.[index]?.organisaatio}
              disabled={!!disabled}
            />
            <TextInput
              label="Puhelinnumero *"
              {...register(`vuorovaikutusTilaisuudet.${tilaisuusIndex}.esitettavatYhteystiedot.yhteysTiedot.${index}.puhelinnumero`)}
              error={(errors as any)?.vuorovaikutusTilaisuudet?.[tilaisuusIndex]?.esitettavatYhteystiedot?.[index]?.puhelinnumero}
              maxLength={maxPhoneLength}
              disabled={!!disabled}
            />
            <TextInput
              label="Sähköpostiosoite *"
              {...register(`vuorovaikutusTilaisuudet.${tilaisuusIndex}.esitettavatYhteystiedot.yhteysTiedot.${index}.sahkoposti`)}
              error={(errors as any)?.vuorovaikutusTilaisuudet?.[tilaisuusIndex]?.esitettavatYhteystiedot?.[index]?.sahkoposti}
              disabled={!!disabled}
            />
          </HassuGrid>
          <div>
            <div className="hidden lg:block lg:mt-8">
              <IconButton
                icon="trash"
                disabled={!!disabled}
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
                disabled={!!disabled}
                endIcon="trash"
              >
                Poista
              </Button>
            </div>
          </div>
        </HassuStack>
      ))}
      <Button
        disabled={!!disabled}
        onClick={(event) => {
          event.preventDefault();
          append(defaultYhteystieto);
        }}
      >
        Lisää uusi +
      </Button>
    </>
  );
}
