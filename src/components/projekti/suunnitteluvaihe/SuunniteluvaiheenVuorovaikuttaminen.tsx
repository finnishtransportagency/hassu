import { Controller, FormProvider, useFieldArray, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import SectionContent from "@components/layout/SectionContent";
import {
  TallennaProjektiInput,
  Projekti,
  api,
  VuorovaikutusInput,
  ProjektiRooli,
  YhteystietoInput,
  VuorovaikutusTilaisuusTyyppi,
} from "@services/api";
import Section from "@components/layout/Section";
import { ReactElement, useEffect, useState, Fragment, useCallback } from "react";
import Button from "@components/button/Button";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import HassuSpinner from "@components/HassuSpinner";
import { KeyedMutator } from "swr";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import DatePicker from "@components/form/DatePicker";
import dayjs from "dayjs";
import { vuorovaikutusSchema } from "src/schemas/vuorovaikutus";
import HassuStack from "@components/layout/HassuStack";
import CheckBox from "@components/form/CheckBox";
import FormGroup from "@components/form/FormGroup";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import { maxPhoneLength } from "src/schemas/puhelinNumero";
import IconButton from "@components/button/IconButton";
import { removeTypeName } from "src/util/removeTypeName";
import LuonnoksetJaAineistot from "./LuonnoksetJaAineistot";
import VuorovaikutusDialog from "./VuorovaikutustilaisuusDialog";
import { formatDate } from "src/util/dateUtils";
import capitalize from "lodash/capitalize";
import { Stack } from "@mui/material";

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

export type VuorovaikutusFormValues = RequiredProjektiFields & {
  suunnitteluVaihe: {
    vuorovaikutus: Pick<
      VuorovaikutusInput,
      | "aineistot"
      | "esitettavatYhteystiedot"
      | "kysymyksetJaPalautteetViimeistaan"
      | "ilmoituksenVastaanottajat"
      | "videot"
      | "vuorovaikutusJulkaisuPaiva"
      | "vuorovaikutusNumero"
      | "vuorovaikutusTilaisuudet"
      | "vuorovaikutusYhteysHenkilot"
      | "julkinen"
    >;
  };
};

const defaultYhteystieto: YhteystietoInput = {
  etunimi: "",
  sukunimi: "",
  organisaatio: "",
  puhelinnumero: "",
  sahkoposti: "",
};

interface Props {
  projekti?: Projekti | null;
  reloadProjekti?: KeyedMutator<ProjektiLisatiedolla | null>;
  isDirtyHandler: (isDirty: boolean) => void;
  vuorovaikutusnro: number;
}

export default function SuunniteluvaiheenVuorovaikuttaminen({
  projekti,
  reloadProjekti,
  isDirtyHandler,
  vuorovaikutusnro,
}: Props): ReactElement {
  const [openVuorovaikutustilaisuus, setOpenVuorovaikutustilaisuus] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const today = dayjs().format();

  const formOptions: UseFormProps<VuorovaikutusFormValues> = {
    resolver: yupResolver(vuorovaikutusSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {},
  };

  const useFormReturn = useForm<VuorovaikutusFormValues>(formOptions);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
    control,
    getValues,
    setValue,
  } = useFormReturn;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot",
  });

  const saveSunnitteluvaihe = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      setIsFormSubmitting(true);
      await api.tallennaProjekti(formData);
      if (reloadProjekti) await reloadProjekti();
    },
    [setIsFormSubmitting, reloadProjekti]
  );

  const saveDraft = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      setIsFormSubmitting(true);
      try {
        await saveSunnitteluvaihe(formData);
        showSuccessMessage("Tallennus onnistui!");
      } catch (e) {
        log.error("OnSubmit Error", e);
        showErrorMessage("Tallennuksessa tapahtui virhe");
      }
      setIsFormSubmitting(false);
    },
    [setIsFormSubmitting, showSuccessMessage, showErrorMessage, saveSunnitteluvaihe]
  );

  const saveAndPublish = useCallback(
    async (formData: VuorovaikutusFormValues) => {
      setIsFormSubmitting(true);
      try {
        setValue("suunnitteluVaihe.vuorovaikutus.julkinen", true);
        await saveSunnitteluvaihe(formData);
        showSuccessMessage("Tallennus onnistui!");
      } catch (e) {
        log.error("OnSubmit Error", e);
        showErrorMessage("Tallennuksessa tapahtui virhe");
      }
      setIsFormSubmitting(false);
    },
    [saveSunnitteluvaihe, setValue, showErrorMessage, showSuccessMessage]
  );

  useEffect(() => {
    isDirtyHandler(isDirty);
  }, [isDirty, isDirtyHandler]);

  useEffect(() => {
    if (projekti && projekti.oid) {
      const v = projekti.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
        return v.vuorovaikutusNumero === vuorovaikutusnro;
      });

      const tallentamisTiedot: VuorovaikutusFormValues = {
        oid: projekti.oid,
        suunnitteluVaihe: {
          vuorovaikutus: {
            vuorovaikutusNumero: vuorovaikutusnro,
            vuorovaikutusJulkaisuPaiva: v?.vuorovaikutusJulkaisuPaiva,
            kysymyksetJaPalautteetViimeistaan: v?.kysymyksetJaPalautteetViimeistaan,
            vuorovaikutusYhteysHenkilot:
              projekti.kayttoOikeudet
                ?.filter(({ kayttajatunnus }) => v?.vuorovaikutusYhteysHenkilot?.includes(kayttajatunnus))
                .map(({ kayttajatunnus }) => kayttajatunnus) || [],
            esitettavatYhteystiedot:
              v?.esitettavatYhteystiedot?.map((yhteystieto) => removeTypeName(yhteystieto)) || [],
            vuorovaikutusTilaisuudet:
              v?.vuorovaikutusTilaisuudet?.map((tilaisuus) => {
                const { __typename, ...vuorovaikutusTilaisuusInput } = tilaisuus;
                return vuorovaikutusTilaisuusInput;
              }) || [],
            julkinen: v?.julkinen,
          },
        },
      };
      reset(tallentamisTiedot);
    }
  }, [projekti, reset, vuorovaikutusnro]);

  if (!projekti) {
    return <></>;
  }

  const vuorovaikutusTilaisuudet = getValues("suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet");

  const isVerkkotilaisuuksia = !!vuorovaikutusTilaisuudet?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA
  );
  const isFyysisiatilaisuuksia = !!vuorovaikutusTilaisuudet?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA
  );
  const isSoittoaikoja = !!vuorovaikutusTilaisuudet?.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA);

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form>
          <fieldset>
            <Section>
              <SectionContent>
                <h4 className="vayla-small-title">Vuorovaikuttaminen</h4>
                <p>
                  Kansalainen pääsee vaikuttamaan väylähankkeen tai väylän suunnitteluun siinä vaiheessa. kun tehdään
                  yleissuunnitelmaa ja kun edetään tie- tai ratasuunnitelmaan. Kaikista suunnittelun vaiheista
                  kuulutetaan tai ilmoitetaan, jotta asianosaisilla on mahdollisuus kommentoida suunnitelmia.
                </p>
              </SectionContent>
              <SectionContent>
                <h4 className="vayla-small-title">Julkaisupäivä</h4>
                <p>
                  Anna päivämäärä, jolloin vuorovaikutusosio palvelun julkisella puolella ja kutsu vuorovaikutukseen
                  muilla ilmoituskanavilla julkaistaan.
                </p>
                <DatePicker
                  label="Julkaisupäivä *"
                  className="md:max-w-min"
                  {...register("suunnitteluVaihe.vuorovaikutus.vuorovaikutusJulkaisuPaiva")}
                  min={today}
                  error={errors.suunnitteluVaihe?.vuorovaikutus?.vuorovaikutusJulkaisuPaiva}
                />
              </SectionContent>
              <SectionContent>
                <h4 className="vayla-small-title">Kysymyksien esittäminen ja palautteiden antaminen</h4>
                <p>Anna päivämäärä, johon mennessä kansalaisten toivotaan esittävän kysymykset ja palautteet.</p>
                <DatePicker
                  label="Kysymykset ja palautteet viimeistään *"
                  className="md:max-w-min"
                  {...register("suunnitteluVaihe.vuorovaikutus.kysymyksetJaPalautteetViimeistaan")}
                  min={today}
                  error={errors.suunnitteluVaihe?.vuorovaikutus?.kysymyksetJaPalautteetViimeistaan}
                />
              </SectionContent>
            </Section>
            <Section>
              <h4 className="vayla-small-title">Vuorovaikutusmahdollisuudet palautteiden ja kysymyksien lisäksi</h4>
              <SectionContent>
                {isVerkkotilaisuuksia && (
                  <>
                    <p>
                      <b>Live-tilaisuudet verkossa</b>
                    </p>
                    {vuorovaikutusTilaisuudet
                      ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA)
                      .map((tilaisuus, index) => {
                        return (
                          <div key={index}>
                            <p>
                              {capitalize(tilaisuus.nimi)}, {formatDate(tilaisuus.paivamaara)} klo{" "}
                              {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}, Linkki tilaisuuteen: {tilaisuus.linkki}
                            </p>
                          </div>
                        );
                      })}
                  </>
                )}
                {isFyysisiatilaisuuksia && (
                  <>
                    <p>
                      <b>Fyysiset tilaisuudet</b>
                    </p>
                    {vuorovaikutusTilaisuudet
                      ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA)
                      .map((tilaisuus, index) => {
                        return (
                          <div key={index}>
                            <p>
                              {capitalize(tilaisuus.nimi)}, {formatDate(tilaisuus.paivamaara)} klo{" "}
                              {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}, Osoite: {tilaisuus.paikka},{" "}
                              {tilaisuus.osoite} {tilaisuus.postinumero} {tilaisuus.postitoimipaikka}
                            </p>
                          </div>
                        );
                      })}
                  </>
                )}
                {isSoittoaikoja && (
                  <>
                    <p>
                      <b>Soittoaika</b>
                    </p>
                    {vuorovaikutusTilaisuudet
                      ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA)
                      .map((tilaisuus, index) => {
                        return (
                          <div key={index}>
                            <p>
                              {capitalize(tilaisuus.nimi)}, {formatDate(tilaisuus.paivamaara)} klo{" "}
                              {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}
                            </p>
                            <p>yhteistiedot TBD</p>
                          </div>
                        );
                      })}
                  </>
                )}

                <Button
                  onClick={(e) => {
                    setOpenVuorovaikutustilaisuus(true);
                    e.preventDefault();
                  }}
                >
                  Lisää tilaisuus
                </Button>
              </SectionContent>
            </Section>
            <LuonnoksetJaAineistot />
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
            </Section>
            <Section>
              <h4 className="vayla-small-title">Kutsun ja ilmoituksen esikatselu</h4>
              <SectionContent>
                <HassuStack direction={["column", "column", "row"]}>
                  <Button type="submit" onClick={() => console.log("kutsun esikatselu")} disabled>
                    Kutsun esikatselu
                  </Button>
                  <Button type="submit" onClick={() => console.log("ilmoituksen esikatselu")} disabled>
                    Ilmoituksen esikatselu
                  </Button>
                </HassuStack>
              </SectionContent>
            </Section>
            <Section noDivider>
              <Stack justifyContent={[undefined, undefined, "flex-end"]} direction={["column", "column", "row"]}>
                <Button onClick={handleSubmit(saveDraft)}>Tallenna luonnos</Button>
                <Button primary onClick={handleSubmit(saveAndPublish)}>
                  Tallenna julkaistavaksi
                </Button>
              </Stack>
            </Section>
          </fieldset>
          <VuorovaikutusDialog
            open={openVuorovaikutustilaisuus}
            windowHandler={setOpenVuorovaikutustilaisuus}
            tilaisuudet={vuorovaikutusTilaisuudet}
          ></VuorovaikutusDialog>
        </form>
      </FormProvider>
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
