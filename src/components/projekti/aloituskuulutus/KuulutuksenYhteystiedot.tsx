import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import CheckBox from "@components/form/CheckBox";
import TextInput from "@components/form/TextInput";
import { AloitusKuulutusInput, Projekti, ProjektiRooli, TallennaProjektiInput, YhteystietoInput } from "@services/api";
import React, { ReactElement } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";

// Extend TallennaProjektiInput by making the field nonnullable and required
type KayttoOikeudet = Pick<TallennaProjektiInput, "kayttoOikeudet">;
type EsitettavatYhteystiedot = Pick<AloitusKuulutusInput, "esitettavatYhteystiedot">;

type KayttoOikeudetRequired = Required<{
  [K in keyof KayttoOikeudet]: NonNullable<KayttoOikeudet[K]>;
}>;

const defaultYhteystieto: YhteystietoInput = {
  etunimi: "",
  sukunimi: "",
  organisaatio: "",
  puhelinnumero: "",
  sahkoposti: "",
};

type FormValues = KayttoOikeudetRequired & { aloitusKuulutus?: EsitettavatYhteystiedot };

interface Props<T> {
  projekti?: Projekti | null;
  useFormReturn: UseFormReturn<T>;
  disableFields?: boolean;
}

function KuulutuksenYhteystiedot<T extends FormValues>({
  projekti,
  useFormReturn,
  disableFields,
}: Props<T>): ReactElement {
  const { control, register } = useFormReturn as unknown as UseFormReturn<FormValues>;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "aloitusKuulutus.esitettavatYhteystiedot",
  });

  return (
    <>
      <h5 className="vayla-small-title">Kuulutuksessa esitettävät yhteystiedot</h5>
      <p>
        Voit valita kuulutuksessa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden
        yhteystiedon. Projektipäällikön tiedot esitetään aina. Projektiin tallennettujen henkilöiden yhteystiedot
        haetaan Projektin henkilöt -sivulle tallennetuista tiedoista.{" "}
      </p>
      <fieldset>
        <p>Projektiin tallennetut henkilöt</p>
        {projekti?.kayttoOikeudet && projekti.kayttoOikeudet.length > 0 ? (
          projekti.kayttoOikeudet.map(({ nimi, rooli }, index) => (
            <CheckBox
              key={index}
              label={nimi}
              {...register(`kayttoOikeudet.${index}.esitetaanKuulutuksessa`)}
              disabled={rooli === ProjektiRooli.PROJEKTIPAALLIKKO}
              defaultChecked={rooli === ProjektiRooli.PROJEKTIPAALLIKKO}
            />
          ))
        ) : (
          <p>Projektilla ei ole tallennettuja henkilöitä</p>
        )}
        <p className="pt-4">Uusi yhteystieto</p>
        <p>
          Lisää uudelle yhteystiedolle rivi Lisää uusi-painikkeella. Huomioi, että uusi yhteystieto ei tallennu
          Projektin henkilöt -sivulle eikä henkilölle tule käyttöoikeuksia projektiin.{" "}
        </p>
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col lg:flex-row mb-10 lg:mb-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 lg:pr-1 relative even:bg-gray-lightest">
              <TextInput
                className="lg:col-span-4 max-w-md"
                label="Etunimi *"
                {...register(`aloitusKuulutus.esitettavatYhteystiedot.${index}.etunimi`)}
              />
              <TextInput
                className="lg:col-span-4 max-w-md"
                label="Sukunimi *"
                {...register(`aloitusKuulutus.esitettavatYhteystiedot.${index}.sukunimi`)}
              />
              <TextInput
                className="lg:col-span-4 max-w-md"
                label="Organisaatio / kunta *"
                {...register(`aloitusKuulutus.esitettavatYhteystiedot.${index}.organisaatio`)}
              />
              <TextInput
                className="lg:col-span-4 max-w-md"
                label="Puhelinnumero *"
                {...register(`aloitusKuulutus.esitettavatYhteystiedot.${index}.puhelinnumero`)}
              />
              <TextInput
                className="lg:col-span-4 max-w-md"
                label="Sähköpostiosoite *"
                {...register(`aloitusKuulutus.esitettavatYhteystiedot.${index}.sahkoposti`)}
              />
            </div>
            <div className="lg:mt-6">
              <div className="hidden lg:block">
                <IconButton
                  icon="trash"
                  onClick={(event) => {
                    event.preventDefault();
                    remove(index);
                  }}
                  disabled={disableFields}
                />
              </div>
              <div className="block lg:hidden">
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    remove(index);
                  }}
                  endIcon="trash"
                  disabled={disableFields}
                >
                  Poista
                </Button>
              </div>
            </div>
          </div>
        ))}

        <Button
          onClick={(event) => {
            event.preventDefault();
            append(defaultYhteystieto);
          }}
          disabled={disableFields}
        >
          Lisää uusi
        </Button>
      </fieldset>
    </>
  );
}

export default KuulutuksenYhteystiedot;
