import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import CheckBox from "@components/form/CheckBox";
import FormGroup from "@components/form/FormGroup";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import HassuStack from "@components/layout/HassuStack";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { AloitusKuulutusInput, KayttajaTyyppi, Projekti, YhteystietoInput } from "@services/api";
import React, { Fragment, ReactElement } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { maxPhoneLength } from "src/schemas/puhelinNumero";
import { formatNimi } from "../../../util/userUtil";

type KuulutusYhteystiedot = Pick<AloitusKuulutusInput, "kuulutusYhteystiedot">;

const defaultYhteystieto: YhteystietoInput = {
  etunimi: "",
  sukunimi: "",
  organisaatio: "",
  puhelinnumero: "",
  sahkoposti: "",
};

type FormValues = { aloitusKuulutus?: KuulutusYhteystiedot };

interface Props {
  projekti?: Projekti | null;
  disableFields?: boolean;
}

function KuulutuksenYhteystiedot({ projekti, disableFields }: Props): ReactElement {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<FormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "aloitusKuulutus.kuulutusYhteystiedot.yhteysTiedot",
  });

  return (
    <Section>
      <SectionContent>
        <h5 className="vayla-small-title">Kuulutuksessa esitettävät yhteystiedot</h5>
        <p>
          Voit valita kuulutuksessa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden yhteystiedon.
          Projektipäällikön tiedot esitetään aina. Projektiin tallennettujen henkilöiden yhteystiedot haetaan Projektin henkilöt -sivulle
          tallennetuista tiedoista.{" "}
        </p>
      </SectionContent>
      {projekti?.kayttoOikeudet && projekti.kayttoOikeudet.length > 0 ? (
        <Controller
          control={control}
          name={`aloitusKuulutus.kuulutusYhteystiedot.yhteysHenkilot`}
          render={({ field: { onChange, value, ...field } }) => (
            <FormGroup label="Projektiin tallennetut henkilöt" inlineFlex>
              {projekti.kayttoOikeudet?.map(({ sukunimi, etunimi, tyyppi, kayttajatunnus }, index) => {
                const tunnuslista: string[] = value || [];
                const nimi = formatNimi({ sukunimi, etunimi });
                return (
                  <Fragment key={index}>
                    {tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO ? (
                      <CheckBox label={nimi} disabled checked {...field} />
                    ) : (
                      <CheckBox
                        label={nimi}
                        onChange={(event) => {
                          if (!event.target.checked) {
                            onChange(tunnuslista.filter((tunnus) => tunnus !== kayttajatunnus));
                          } else {
                            onChange([...tunnuslista, kayttajatunnus]);
                          }
                        }}
                        checked={tunnuslista.includes(kayttajatunnus)}
                        {...field}
                      />
                    )}
                  </Fragment>
                );
              })}
            </FormGroup>
          )}
        />
      ) : (
        <p>Projektilla ei ole tallennettuja henkilöitä</p>
      )}
      <SectionContent>
        <p>Uusi yhteystieto</p>
        <p>
          Lisää uudelle yhteystiedolle rivi Lisää uusi-painikkeella. Huomioi, että uusi yhteystieto ei tallennu Projektin henkilöt -sivulle
          eikä henkilölle tule käyttöoikeuksia projektiin.{" "}
        </p>
      </SectionContent>
      {fields.map((field, index) => (
        <HassuStack key={field.id} direction={["column", "column", "row"]}>
          <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 3]}>
            <TextInput
              label="Etunimi *"
              {...register(`aloitusKuulutus.kuulutusYhteystiedot.yhteysTiedot.${index}.etunimi`)}
              error={(errors as any)?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot?.[index]?.etunimi}
            />
            <TextInput
              label="Sukunimi *"
              {...register(`aloitusKuulutus.kuulutusYhteystiedot.yhteysTiedot.${index}.sukunimi`)}
              error={(errors as any)?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot?.[index]?.sukunimi}
            />
            <TextInput
              label="Organisaatio / kunta *"
              {...register(`aloitusKuulutus.kuulutusYhteystiedot.yhteysTiedot.${index}.organisaatio`)}
              error={(errors as any)?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot?.[index]?.organisaatio}
            />
            <TextInput
              label="Puhelinnumero *"
              {...register(`aloitusKuulutus.kuulutusYhteystiedot.yhteysTiedot.${index}.puhelinnumero`)}
              error={(errors as any)?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot?.[index]?.puhelinnumero}
              maxLength={maxPhoneLength}
            />
            <TextInput
              label="Sähköpostiosoite *"
              {...register(`aloitusKuulutus.kuulutusYhteystiedot.yhteysTiedot.${index}.sahkoposti`)}
              error={(errors as any)?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot?.[index]?.sahkoposti}
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
