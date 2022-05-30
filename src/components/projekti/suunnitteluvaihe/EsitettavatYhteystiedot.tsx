import { Controller, useFieldArray } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import {
  TallennaProjektiInput,
  Projekti,
  VuorovaikutusInput,
  ProjektiRooli,
  YhteystietoInput
} from "@services/api";
import Section from "@components/layout/Section";
import { ReactElement, useMemo, Fragment } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import CheckBox from "@components/form/CheckBox";
import FormGroup from "@components/form/FormGroup";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import { maxPhoneLength } from "src/schemas/puhelinNumero";
import IconButton from "@components/button/IconButton";
import { UseFormReturn } from "react-hook-form";
import capitalize from "lodash/capitalize";
import replace from "lodash/replace";

const defaultYhteystieto: YhteystietoInput = {
  etunimi: "",
  sukunimi: "",
  organisaatio: "",
  puhelinnumero: "",
  sahkoposti: "",
};

type EsitettavatYhteystiedot = Pick<VuorovaikutusInput, "esitettavatYhteystiedot">;
type VuorovaikutusYhteysHenkilot = Pick<VuorovaikutusInput, "vuorovaikutusYhteysHenkilot">;

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
  suunnitteluVaihe: {
    vuorovaikutus: EsitettavatYhteystiedot | VuorovaikutusYhteysHenkilot;
  };
};

interface Props<T> {
  useFormReturn: UseFormReturn<T>;
  projekti: Projekti;
  vuorovaikutusnro: number;
}

export default function EsitettavatYhteystiedot<T extends FormValues>({
  projekti,
  vuorovaikutusnro,
  useFormReturn,
}: Props<T>): ReactElement {

  const v = useMemo(() => {
    return projekti?.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
      return v.vuorovaikutusNumero === vuorovaikutusnro;
    });
  }, [projekti, vuorovaikutusnro]);

  const julkinen = v?.julkinen;

  const {
    register,
    formState: { errors },
    control
  } = useFormReturn as UseFormReturn<FormValues>;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot",
  });

  //TODO: lisää v?.vuorovaikutusYhteyshenkilot
  if (julkinen) {
    return (
      <Section>
        <SectionContent>
          <p className="vayla-label mb-5">Vuorovaikuttamisen yhteyshenkilöt</p>
          {v?.esitettavatYhteystiedot?.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {capitalize(yhteystieto.etunimi)} {capitalize(yhteystieto.sukunimi)}, puh. {yhteystieto.puhelinnumero},{" "}
              {yhteystieto?.sahkoposti ? replace(yhteystieto?.sahkoposti, "@", "[at]") : ""} ({yhteystieto.organisaatio})
            </p>
          ))}
        </SectionContent>
      </Section>
    );
  }

  return (
    <Section>
      <SectionContent>
        <h4 className="vayla-small-title">Vuorovaikuttamisen yhteyshenkilöt</h4>
        <p>
          Voit valita kutsussa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden
          yhteystiedon. Projektipäällikön tiedot esitetään aina. Projektiin tallennettujen henkilöiden
          yhteystiedot haetaan Projektin henkilöt -sivulle tallennetuista tiedoista.
        </p>
        {projekti?.kayttoOikeudet && projekti.kayttoOikeudet.length > 0 ? (
          <Controller
            control={control}
            name={`suunnitteluVaihe.vuorovaikutus.vuorovaikutusYhteysHenkilot`}
            render={({ field: { onChange, value, ...field } }) => (
              <FormGroup label="Projektiin tallennetut henkilöt" inlineFlex>
                {projekti.kayttoOikeudet?.map(({ nimi, rooli, kayttajatunnus }, index) => {
                  const tunnuslista = value || [];
                  return (
                    <Fragment key={index}>
                      {rooli === ProjektiRooli.PROJEKTIPAALLIKKO ? (
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
                {projekti?.suunnitteluSopimus &&
                  <CheckBox label={`${projekti.suunnitteluSopimus.sukunimi}, ${projekti.suunnitteluSopimus.etunimi}`} disabled defaultChecked />
                }
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
          Lisää uudelle yhteystiedolle rivi Lisää uusi-painikkeella. Huomioi, että uusi yhteystieto ei tallennu
          Projektin henkilöt -sivulle eikä henkilölle tule käyttöoikeuksia projektiin.
        </p>
      </SectionContent>
      {fields.map((field, index) => (
        <HassuStack key={field.id} direction={["column", "column", "row"]}>
          <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 3]}>
            <TextInput
              label="Etunimi *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.${index}.etunimi`)}
              error={
                (errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.etunimi
              }
            />
            <TextInput
              label="Sukunimi *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.${index}.sukunimi`)}
              error={
                (errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.sukunimi
              }
            />
            <TextInput
              label="Organisaatio / kunta *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.${index}.organisaatio`)}
              error={
                (errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.organisaatio
              }
            />
            <TextInput
              label="Puhelinnumero *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.${index}.puhelinnumero`)}
              error={
                (errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]
                  ?.puhelinnumero
              }
              maxLength={maxPhoneLength}
            />
            <TextInput
              label="Sähköpostiosoite *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.${index}.sahkoposti`)}
              error={
                (errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.sahkoposti
              }
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
