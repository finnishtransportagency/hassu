import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import CheckBox from "@components/form/CheckBox";
import FormGroup from "@components/form/FormGroup";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import HassuStack from "@components/layout/HassuStack";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { AloitusKuulutusInput, KayttajaTyyppi, Projekti, YhteystietoInput, ProjektiKayttaja } from "@services/api";
import { BooleanNullable } from "aws-sdk/clients/glue";
import React, { ReactElement, Fragment, useMemo } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { maxPhoneLength } from "src/schemas/puhelinNumero";

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
  vaiheAvainsana: "aloitusKuulutus";
  yhteystiedotAvainsana: "kuulutusYhteystiedot";
  kunnanEdustajaPakotetaan: BooleanNullable;
  projekti?: Projekti | null;
}

export default function FormStandardiYhteystiedot({
  projekti,
  kunnanEdustajaPakotetaan,
  vaiheAvainsana,
  yhteystiedotAvainsana,
}: Props): ReactElement {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<FormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `${vaiheAvainsana}.${yhteystiedotAvainsana}.yhteysTiedot`,
  });

  const yhteysHenkiloVaihtoehdot = useMemo(() => {
    if (projekti && kunnanEdustajaPakotetaan && projekti?.suunnitteluSopimus?.yhteysHenkilo) {
      let kunnanEdustaja: ProjektiKayttaja | undefined;
      let muut: ProjektiKayttaja[] = [];
      projekti?.kayttoOikeudet?.forEach((hlo) => {
        if (hlo.kayttajatunnus === projekti.suunnitteluSopimus?.yhteysHenkilo) {
          kunnanEdustaja = hlo;
        } else {
          muut.push(hlo);
        }
      });
      if (kunnanEdustaja) {
        return [{ ...kunnanEdustaja, organisaatio: projekti?.suunnitteluSopimus?.kunta }].concat(muut);
      }
    }
    let projari: ProjektiKayttaja | undefined;
    let eiProjarit: ProjektiKayttaja[] = [];
    projekti?.kayttoOikeudet?.forEach((hlo) => {
      if (hlo.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO) {
        projari = hlo;
      } else {
        eiProjarit.push(hlo);
      }
    });
    return [projari].concat(eiProjarit) as ProjektiKayttaja[];
  }, [projekti, kunnanEdustajaPakotetaan]);

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
      {yhteysHenkiloVaihtoehdot && yhteysHenkiloVaihtoehdot.length > 0 ? (
        <Controller
          control={control}
          name={`${vaiheAvainsana}.${yhteystiedotAvainsana}.yhteysHenkilot`}
          render={({ field: { onChange, value, ...field } }) => (
            <FormGroup label="Projektiin tallennetut henkilöt" inlineFlex>
              {yhteysHenkiloVaihtoehdot.map(({ nimi, tyyppi, kayttajatunnus, organisaatio }, index) => {
                const tunnuslista: string[] = value || [];
                return (
                  <Fragment key={index}>
                    {index === 0 ? (
                      <CheckBox
                        label={`${nimi}, ${tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO ? "projektipäällikkö" : organisaatio}`}
                        disabled
                        checked
                        {...field}
                      />
                    ) : (
                      <CheckBox
                        label={`${nimi}, ${
                          tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO
                            ? "projektipäällikkö"
                            : tyyppi === KayttajaTyyppi.VARAHENKILO
                            ? "varahenkilö"
                            : organisaatio
                        }`}
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
              {...register(`${vaiheAvainsana}.${yhteystiedotAvainsana}.yhteysTiedot.${index}.etunimi`)}
              error={(errors as any)?.[vaiheAvainsana]?.[yhteystiedotAvainsana]?.yhteysTiedot?.[index]?.etunimi}
            />
            <TextInput
              label="Sukunimi *"
              {...register(`${vaiheAvainsana}.${yhteystiedotAvainsana}.yhteysTiedot.${index}.sukunimi`)}
              error={(errors as any)?.[vaiheAvainsana]?.[yhteystiedotAvainsana]?.yhteysTiedot?.[index]?.sukunimi}
            />
            <TextInput
              label="Organisaatio / kunta *"
              {...register(`${vaiheAvainsana}.${yhteystiedotAvainsana}.yhteysTiedot.${index}.organisaatio`)}
              error={(errors as any)?.[vaiheAvainsana]?.[yhteystiedotAvainsana]?.yhteysTiedot?.[index]?.organisaatio}
            />
            <TextInput
              label="Puhelinnumero *"
              {...register(`${vaiheAvainsana}.${yhteystiedotAvainsana}.yhteysTiedot.${index}.puhelinnumero`)}
              error={(errors as any)?.[vaiheAvainsana]?.[yhteystiedotAvainsana]?.yhteysTiedot?.[index]?.puhelinnumero}
              maxLength={maxPhoneLength}
            />
            <TextInput
              label="Sähköpostiosoite *"
              {...register(`${vaiheAvainsana}.${yhteystiedotAvainsana}.yhteysTiedot.${index}.sahkoposti`)}
              error={(errors as any)?.[vaiheAvainsana]?.[yhteystiedotAvainsana]?.yhteysTiedot?.[index]?.sahkoposti}
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
        </HassuStack>
      ))}
      <Button
        id="add_new_contact"
        onClick={(event) => {
          event.preventDefault();
          append(defaultYhteystieto);
        }}
      >
        Lisää uusi +
      </Button>
    </Section>
  );
}
