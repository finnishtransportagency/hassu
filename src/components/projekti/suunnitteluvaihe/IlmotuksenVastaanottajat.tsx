import { useFieldArray } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import {
  TallennaProjektiInput,
  ViranomaisVastaanottajaInput,
  YhteystietoInput,
  VuorovaikutusInput
} from "@services/api";
import Section from "@components/layout/Section";
import { ReactElement } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import IconButton from "@components/button/IconButton";
import { UseFormReturn } from "react-hook-form";

const defaultYhteystieto: YhteystietoInput = {
  etunimi: "",
  sukunimi: "",
  organisaatio: "",
  puhelinnumero: "",
  sahkoposti: "",
};

type IlmoituksenVastaanottajat = Pick<VuorovaikutusInput, "ilmoituksenVastaanottajat">;

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
  suunnitteluVaihe: {
    vuorovaikutus: IlmoituksenVastaanottajat;
  };
};

interface Props<T> {
  useFormReturn: UseFormReturn<T>;
}

export default function IlmoituksenVastaanottajat<T extends FormValues>({
  useFormReturn,
}: Props<T>): ReactElement {

  const {
    register,
    formState: { errors },
    control
  } = useFormReturn as UseFormReturn<FormValues>;

  const { fields: fieldsViranomaiset, append: appendViranomaiset, remove: removeViranomaiset } = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.viranomaiset",
  });

  return (
    <Section>
      <h4 className="vayla-small-title">Ilmoituksen vastaanottajat</h4>
      <SectionContent>
        <p>
          Vuorovaikuttamisesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville
          kunnille. Kunnat on haettu Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle
          viranomaisorganisaatiolle, lisää uusi rivi Lisää uusi -painikkeella
        </p>
        <p>Jos kuntatiedoissa on virhe, tee korjaus Projektivelhoon.</p>
      </SectionContent>
      <SectionContent>
        <p>Uusi yhteystieto</p>
        <p>
          Lisää uudelle yhteystiedolle rivi Lisää uusi-painikkeella. Huomioi, että uusi yhteystieto ei tallennu
          Projektin henkilöt -sivulle eikä henkilölle tule käyttöoikeuksia projektiin.
        </p>
      </SectionContent>
      {fieldsViranomaiset.map((field :  ViranomaisVastaanottajaInput, index: number) => (
        <HassuStack key={field.nimi} direction={["column", "column", "row"]}>
          <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 3]}>
            <TextInput
              label="Etunimi *"
              {...register(`suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.viranomaiset.${index}.nimi`)}
              error={
                (errors as any)?.suunnitteluVaihe?.vuorovaikutus?.ilmoituksenVastaanottajat?.[index]?.nimi
              }
            />
          </HassuGrid>
          <div>
            <div className="hidden lg:block lg:mt-8">
              <IconButton
                icon="trash"
                onClick={(event) => {
                  event.preventDefault();
                  removeViranomaiset(index);
                }}
              />
            </div>
            <div className="block lg:hidden">
              <Button
                onClick={(event) => {
                  event.preventDefault();
                  removeViranomaiset(index);
                }}
                endIcon="trash"
              >
                Poista
              </Button>
            </div>
          </div>
        </HassuStack>
      ))}
      <Button
        onClick={(event) => {
          event.preventDefault();
          appendViranomaiset(defaultYhteystieto);
        }}
      >
        Lisää uusi +
      </Button>
    </Section>
  );
}
