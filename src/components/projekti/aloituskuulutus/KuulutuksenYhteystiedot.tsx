import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import CheckBox from "@components/form/CheckBox";
import FormGroup from "@components/form/FormGroup";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import HassuStack from "@components/layout/HassuStack";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { AloitusKuulutusInput, Projekti, ProjektiRooli, TallennaProjektiInput, YhteystietoInput } from "@services/api";
import React, { ReactElement } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { maxPhoneLength } from "src/schemas/puhelinNumero";

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
  const {
    control,
    register,
    formState: { errors },
  } = useFormReturn as unknown as UseFormReturn<FormValues>;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "aloitusKuulutus.esitettavatYhteystiedot",
  });

  return (
    <Section>
      <SectionContent>
        <h5 className="vayla-small-title">Kuulutuksessa esitettävät yhteystiedot</h5>
        <p>
          Voit valita kuulutuksessa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden
          yhteystiedon. Projektipäällikön tiedot esitetään aina. Projektiin tallennettujen henkilöiden yhteystiedot
          haetaan Projektin henkilöt -sivulle tallennetuista tiedoista.{" "}
        </p>
      </SectionContent>
      {(projekti?.kayttoOikeudet && projekti.kayttoOikeudet.length > 0) || projekti?.suunnitteluSopimus ? (
        <FormGroup label="Projektiin tallennetut henkilöt" inlineFlex>
          {projekti?.kayttoOikeudet?.map(({ nimi, rooli }, index) =>
            rooli === ProjektiRooli.PROJEKTIPAALLIKKO ? (
              <CheckBox key={index} label={nimi} disabled defaultChecked />
            ) : (
              <CheckBox key={index} label={nimi} {...register(`kayttoOikeudet.${index}.esitetaanKuulutuksessa`)} />
            )
          )}
          {projekti?.suunnitteluSopimus &&
            <CheckBox label={`${projekti.suunnitteluSopimus.sukunimi}, ${projekti.suunnitteluSopimus.etunimi}`} disabled defaultChecked />
          }
        </FormGroup>
      ) : (
        <p>Projektilla ei ole tallennettuja henkilöitä</p>
      )}
      <SectionContent>
        <p>Uusi yhteystieto</p>
        <p>
          Lisää uudelle yhteystiedolle rivi Lisää uusi-painikkeella. Huomioi, että uusi yhteystieto ei tallennu
          Projektin henkilöt -sivulle eikä henkilölle tule käyttöoikeuksia projektiin.{" "}
        </p>
      </SectionContent>
      {fields.map((field, index) => (
        <HassuStack key={field.id} direction={["column", "column", "row"]}>
          <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 3]}>
            <TextInput
              label="Etunimi *"
              {...register(`aloitusKuulutus.esitettavatYhteystiedot.${index}.etunimi`)}
              error={(errors as any)?.aloitusKuulutus?.esitettavatYhteystiedot?.[index]?.etunimi}
            />
            <TextInput
              label="Sukunimi *"
              {...register(`aloitusKuulutus.esitettavatYhteystiedot.${index}.sukunimi`)}
              error={(errors as any)?.aloitusKuulutus?.esitettavatYhteystiedot?.[index]?.sukunimi}
            />
            <TextInput
              label="Organisaatio / kunta *"
              {...register(`aloitusKuulutus.esitettavatYhteystiedot.${index}.organisaatio`)}
              error={(errors as any)?.aloitusKuulutus?.esitettavatYhteystiedot?.[index]?.organisaatio}
            />
            <TextInput
              label="Puhelinnumero *"
              {...register(`aloitusKuulutus.esitettavatYhteystiedot.${index}.puhelinnumero`)}
              error={(errors as any)?.aloitusKuulutus?.esitettavatYhteystiedot?.[index]?.puhelinnumero}
              maxLength={maxPhoneLength}
            />
            <TextInput
              label="Sähköpostiosoite *"
              {...register(`aloitusKuulutus.esitettavatYhteystiedot.${index}.sahkoposti`)}
              error={(errors as any)?.aloitusKuulutus?.esitettavatYhteystiedot?.[index]?.sahkoposti}
            />
          </HassuGrid>
          <div>
            <div className="hidden lg:block lg:mt-8">
              <IconButton
                name="contact_info_trash_button"
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
        </HassuStack>
      ))}
      <Button
        id="add_new_contact"
        onClick={(event) => {
          event.preventDefault();
          append(defaultYhteystieto);
        }}
        disabled={disableFields}
      >
        Lisää uusi +
      </Button>
    </Section>
  );
}

export default KuulutuksenYhteystiedot;
