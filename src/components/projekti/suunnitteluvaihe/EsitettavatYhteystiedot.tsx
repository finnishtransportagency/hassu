import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import { Yhteystieto, YhteystietoInput } from "@services/api";
import Section from "@components/layout/Section";
import { Fragment, ReactElement, useMemo } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import CheckBox from "@components/form/CheckBox";
import FormGroup from "@components/form/FormGroup";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import { maxPhoneLength } from "src/schemas/puhelinNumero";
import IconButton from "@components/button/IconButton";
import StandardiYhteystiedotListana from "../common/StandardiYhteystiedotListana";
import { useProjekti } from "src/hooks/useProjekti";
import { VuorovaikutusFormValues } from "./SuunnitteluvaiheenVuorovaikuttaminen";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";

const defaultYhteystieto: YhteystietoInput = {
  etunimi: "",
  sukunimi: "",
  organisaatio: "",
  puhelinnumero: "",
  sahkoposti: "",
};

interface Props {
  vuorovaikutusnro: number;
  projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[];
}

export default function EsitettavatYhteystiedot({ vuorovaikutusnro, projektiHenkilot }: Props): ReactElement {
  const { data: projekti } = useProjekti();

  const v = useMemo(() => {
    return projekti?.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
      return v.vuorovaikutusNumero === vuorovaikutusnro;
    });
  }, [projekti, vuorovaikutusnro]);

  const julkinen = v?.julkinen;

  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<VuorovaikutusFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.yhteysTiedot",
  });

  if (julkinen && v.esitettavatYhteystiedot) {
    return (
      <Section>
        <SectionContent>
          <p className="vayla-label mb-5">Vuorovaikuttamisen yhteyshenkilöt</p>
          <StandardiYhteystiedotListana
            projekti={projekti}
            standardiYhteystiedot={v.esitettavatYhteystiedot}
            pakotaProjariTaiKunnanEdustaja={true}
          />
        </SectionContent>
      </Section>
    );
  }

  return (
    <Section className="mt-8">
      <SectionContent>
        <h4 className="vayla-small-title">Vuorovaikuttamisen yhteyshenkilöt</h4>
        <p>
          Voit valita kutsussa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden yhteystiedon. Projektipäällikön
          tiedot esitetään aina. Projektiin tallennettujen henkilöiden yhteystiedot haetaan Projektin henkilöt -sivulle tallennetuista
          tiedoista.
        </p>
        {projekti?.kayttoOikeudet && projekti.kayttoOikeudet.length > 0 ? (
          <Controller
            control={control}
            name={`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.yhteysHenkilot`}
            render={({ field: { onChange, value, ...field } }) => (
              <FormGroup label="Projektiin tallennetut henkilöt" inlineFlex>
                {projektiHenkilot.map((hlo, index) => {
                  const tunnuslista = value || [];
                  const nimi = formatNimi({ sukunimi, etunimi });
                  return (
                    <Fragment key={index}>
                      {index === 0 ? (
                        <CheckBox label={yhteystietoVirkamiehelleTekstiksi(hlo)} disabled checked {...field} />
                      ) : (
                        <CheckBox
                          label={yhteystietoVirkamiehelleTekstiksi(hlo)}
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
      </SectionContent>
      <SectionContent>
        <p>Uusi yhteystieto</p>
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
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.yhteysTiedot.${index}.etunimi`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.etunimi}
            />
            <TextInput
              label="Sukunimi *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.yhteysTiedot.${index}.sukunimi`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.sukunimi}
            />
            <TextInput
              label="Organisaatio / kunta *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.yhteysTiedot.${index}.organisaatio`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.organisaatio}
            />
            <TextInput
              label="Puhelinnumero *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.yhteysTiedot.${index}.puhelinnumero`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.puhelinnumero}
              maxLength={maxPhoneLength}
            />
            <TextInput
              label="Sähköpostiosoite *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.yhteysTiedot.${index}.sahkoposti`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.sahkoposti}
            />
          </HassuGrid>
          <div>
            <div className="hidden lg:block lg:mt-8">
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
        </HassuStack>
      ))}
      <Button
        id="append_vuorovaikuttamisen_yhteystiedot_button"
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
