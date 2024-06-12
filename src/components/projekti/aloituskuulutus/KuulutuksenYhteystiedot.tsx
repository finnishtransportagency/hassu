import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import FormGroup from "@components/form/FormGroup";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import HassuStack from "@components/layout/HassuStack";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { Checkbox, FormControlLabel } from "@mui/material";
import { AloitusKuulutusInput, KayttajaTyyppi, Projekti, ProjektiKayttaja, Yhteystieto, YhteystietoInput } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import React, { ReactElement, Fragment, useMemo } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { maxPhoneLength } from "src/schemas/puhelinNumero";
import projektiKayttajaToYhteystieto, { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";

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

  const { t } = useTranslation("common");

  const projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[] = useMemo(() => {
    const kunnanEdustaja = projekti?.kayttoOikeudet?.find((hlo) => hlo.kayttajatunnus === projekti.suunnitteluSopimus?.yhteysHenkilo);
    const projari = projekti?.kayttoOikeudet?.find((hlo) => hlo.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO);
    const arr: ProjektiKayttaja[] = [];
    if (kunnanEdustaja) {
      arr.push(kunnanEdustaja);
      projekti?.kayttoOikeudet?.forEach((hlo) => {
        if (hlo.kayttajatunnus !== projekti.suunnitteluSopimus?.yhteysHenkilo) {
          arr.push(hlo);
        }
      });
    } else {
      if (projari) {
        arr.push(projari);
      }
      projekti?.kayttoOikeudet?.forEach((hlo) => {
        if (hlo.tyyppi !== KayttajaTyyppi.PROJEKTIPAALLIKKO) {
          arr.push(hlo);
        }
      });
    }
    return arr.map((hlo) => ({ kayttajatunnus: hlo.kayttajatunnus, ...projektiKayttajaToYhteystieto(hlo, projekti?.suunnitteluSopimus) }));
  }, [projekti]);

  return (
    <Section>
      <SectionContent>
        <h3 className="vayla-subtitle">Kuulutuksessa esitettävät yhteystiedot</h3>
        <p>
          Voit valita kuulutuksessa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden yhteystiedon.
          Projektipäällikön tiedot esitetään aina. Projektiin tallennettujen henkilöiden yhteystiedot haetaan Projektin henkilöt -sivulle
          tallennetuista tiedoista.
        </p>
      </SectionContent>
      {projekti?.kayttoOikeudet && projekti.kayttoOikeudet.length > 0 ? (
        <Controller
          control={control}
          name={`aloitusKuulutus.kuulutusYhteystiedot.yhteysHenkilot`}
          render={({ field: { onChange, value, ...field } }) => (
            <FormGroup label="Projektiin tallennetut henkilöt" inlineFlex>
              {projektiHenkilot.map((hlo, index) => {
                const tunnuslista: string[] = value || [];
                return (
                  <Fragment key={index}>
                    {index === 0 ? (
                      <FormControlLabel
                        sx={{ marginLeft: "0px" }}
                        label={yhteystietoVirkamiehelleTekstiksi(hlo, t)}
                        control={<Checkbox checked disabled {...field} />}
                      />
                    ) : (
                      <FormControlLabel
                        sx={{ marginLeft: "0px" }}
                        label={yhteystietoVirkamiehelleTekstiksi(hlo, t)}
                        control={
                          <Checkbox
                            onChange={(event) => {
                              if (!event.target.checked) {
                                onChange(tunnuslista.filter((tunnus) => tunnus !== hlo.kayttajatunnus));
                              } else {
                                onChange([...tunnuslista, hlo.kayttajatunnus]);
                              }
                            }}
                            checked={tunnuslista.includes(hlo.kayttajatunnus)}
                            {...field}
                          />
                        }
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
        <h5>Uusi yhteystieto</h5>
        <p>
          Lisää uudelle yhteystiedolle rivi Lisää uusi-painikkeella. Huomioi, että uusi yhteystieto ei tallennu Projektin henkilöt -sivulle
          eikä henkilölle tule käyttöoikeuksia projektiin.
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
