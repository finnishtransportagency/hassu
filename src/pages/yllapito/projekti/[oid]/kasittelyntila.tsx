import React, { ReactElement, useCallback, useState, useMemo, useEffect, VFC } from "react";
import { KasittelyntilaInput, Status, TallennaProjektiInput } from "@services/api";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import { Controller, useForm, UseFormProps } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import HassuSpinner from "@components/HassuSpinner";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import HassuStack from "@components/layout/HassuStack";
import Button from "@components/button/Button";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import { yupResolver } from "@hookform/resolvers/yup";
import { kasittelynTilaSchema } from "src/schemas/kasittelynTila";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import { HassuDatePickerWithController, HassuDatePicker, HassuDatePickerWithControllerProps } from "@components/form/HassuDatePicker";
import ExtLink from "@components/ExtLink";
import Notification, { NotificationType } from "@components/notification/Notification";
import HassuGridItem from "@components/HassuGridItem";
import LuoJatkopaatosDialog from "@components/projekti/kasittelyntila/LuoJatkopaatosDialog";
import { useRouter } from "next/router";
import TextInput from "@components/form/TextInput";
import KasittelyntilaLukutila from "@components/projekti/lukutila/KasittelynTilaLukutila";
import { formatDate, parseValidDateOtherwiseReturnNull } from "common/util/dateUtils";
import Select from "@components/form/Select";
import { suunnitelmanTilat } from "common/generated/kasittelynTila";
import CheckBox from "@components/form/CheckBox";
import Textarea from "@components/form/Textarea";
import useApi from "src/hooks/useApi";
import dayjs, { Dayjs } from "dayjs";
import { isProjektiStatusGreaterOrEqualTo } from "common/statusOrder";
import FormGroup from "@components/form/FormGroup";
import RadioButton from "@components/form/RadioButton";
import styled from "@emotion/styled";

const FormGroupWithBoldLabel = styled(FormGroup)(() => ({
  "> label": {
    fontWeight: "bold",
  },
  label: {
    marginBottom: "0.5rem",
  },
}));

type FormValues = Pick<TallennaProjektiInput, "oid" | "versio" | "kasittelynTila">;

export default function KasittelyntilaSivu(): ReactElement {
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti({ revalidateOnMount: true });
  const epaAktivoitumisPvm = useMemo(() => {
    if (projekti?.jatkoPaatos2VaiheJulkaisu || projekti?.jatkoPaatos1VaiheJulkaisu) {
      const viimeisinHyvaksymisKuulutusPvm =
        projekti?.jatkoPaatos2VaiheJulkaisu?.kuulutusVaihePaattyyPaiva || projekti?.jatkoPaatos1VaiheJulkaisu?.kuulutusVaihePaattyyPaiva;

      return dayjs(viimeisinHyvaksymisKuulutusPvm).add(6, "month"); // Jatkopaatokset epaaktivoituu 6 kuukaudessa
    } else if (projekti?.hyvaksymisPaatosVaiheJulkaisu) {
      return dayjs(projekti.hyvaksymisPaatosVaiheJulkaisu.kuulutusVaihePaattyyPaiva).add(12, "month"); // Hyvaksymispaatokset epaaktivoituu 12 kuukaudessa
    }
  }, [projekti?.hyvaksymisPaatosVaiheJulkaisu, projekti?.jatkoPaatos1VaiheJulkaisu, projekti?.jatkoPaatos2VaiheJulkaisu]);

  const onEpaAktivoitumassa = useMemo(() => {
    if (!epaAktivoitumisPvm) return false;
    const now = dayjs();
    return epaAktivoitumisPvm.diff(now, "month", true) <= 1 && now.isBefore(epaAktivoitumisPvm, "day"); // Varoitellaan 1 kuukautta ennen, "true" lisaa muutoin putoavat desimaalit, jotta varoitukset ei ala heti alle 2 kk jalkeen
  }, [epaAktivoitumisPvm]);

  return (
    <ProjektiPageLayout title="Käsittelyn tila">
      {projekti && onEpaAktivoitumassa && projekti.nykyinenKayttaja.omaaMuokkausOikeuden && (
        <Notification type={NotificationType.INFO_GRAY}>
          Suunnitelma muuttuu epäaktiivikseksi {formatDate(epaAktivoitumisPvm)}. Samalla kun suunnitelma muuttuu epäaktiivikseksi, projektin
          jäseniltä päättyvät muokkausoikeudet suunnitelmaan ja suunnitelman aineistot poistetaan järjestelmästä. Huolehdithan, että kaikki
          tarvittavat asiakirjat on tallennettu asianhallintaan ja muihin tallennuspaikkoihin ennen muokkausoikeuksien päättymistä.
        </Notification>
      )}
      {projekti &&
        (!projekti?.nykyinenKayttaja.onProjektipaallikko ? (
          <KasittelyntilaLukutila projekti={projekti} />
        ) : (
          <KasittelyntilaPageContent projekti={projekti} projektiLoadError={projektiLoadError} reloadProjekti={reloadProjekti} />
        ))}
    </ProjektiPageLayout>
  );
}

interface HenkilotFormProps {
  projekti: ProjektiLisatiedolla;
  projektiLoadError: any;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
}

function removeEmptyValues(data: FormValues): FormValues {
  if (data.kasittelynTila) {
    const { hallintoOikeus, korkeinHallintoOikeus, ...rest } = data.kasittelynTila;
    const kasittelynTila: KasittelyntilaInput = { ...rest };
    if (hallintoOikeus?.hyvaksymisPaatosKumottu === true || hallintoOikeus?.hyvaksymisPaatosKumottu === false) {
      kasittelynTila.hallintoOikeus = {
        hyvaksymisPaatosKumottu: hallintoOikeus.hyvaksymisPaatosKumottu,
        valipaatos: {
          paiva: hallintoOikeus.valipaatos?.paiva,
          sisalto: hallintoOikeus.valipaatos?.sisalto,
        },
        paatos: {
          paiva: hallintoOikeus.paatos?.paiva,
          sisalto: hallintoOikeus.paatos?.sisalto,
        },
      };
    }
    if (
      hallintoOikeus === null ||
      hallintoOikeus?.hyvaksymisPaatosKumottu === undefined ||
      hallintoOikeus?.hyvaksymisPaatosKumottu === null
    ) {
      kasittelynTila.hallintoOikeus = null;
    }
    if (korkeinHallintoOikeus?.hyvaksymisPaatosKumottu === true || korkeinHallintoOikeus?.hyvaksymisPaatosKumottu === false) {
      kasittelynTila.korkeinHallintoOikeus = {
        hyvaksymisPaatosKumottu: korkeinHallintoOikeus.hyvaksymisPaatosKumottu,
        valipaatos: {
          paiva: korkeinHallintoOikeus.valipaatos?.paiva,
          sisalto: korkeinHallintoOikeus.valipaatos?.sisalto,
        },
        paatos: {
          paiva: korkeinHallintoOikeus.paatos?.paiva,
          sisalto: korkeinHallintoOikeus.paatos?.sisalto,
        },
      };
    }
    if (
      korkeinHallintoOikeus === null ||
      korkeinHallintoOikeus?.hyvaksymisPaatosKumottu === undefined ||
      korkeinHallintoOikeus?.hyvaksymisPaatosKumottu === null
    ) {
      kasittelynTila.korkeinHallintoOikeus = null;
    }
    return {
      ...data,
      kasittelynTila,
    };
  }
  return data;
}

function KasittelyntilaPageContent({ projekti, projektiLoadError, reloadProjekti }: HenkilotFormProps): ReactElement {
  const router = useRouter();
  const [openTallenna, setOpenTallenna] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const isLoadingProjekti = !projekti && !projektiLoadError;

  const disableAdminOnlyFields = !projekti?.nykyinenKayttaja.onYllapitaja || !!projektiLoadError || isLoadingProjekti || isFormSubmitting;

  const hyvaksymispaatosDisabled =
    !projekti.nykyinenKayttaja.onProjektipaallikko ||
    !!projektiLoadError ||
    isLoadingProjekti ||
    isFormSubmitting ||
    !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO);

  const defaultValues: FormValues = useMemo(() => {
    const kasittelynTila: KasittelyntilaInput = {
      hyvaksymispaatos: {
        paatoksenPvm: projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm || null,
        asianumero: projekti.kasittelynTila?.hyvaksymispaatos?.asianumero || "",
      },
    };

    //TODO When the input fields are enabled, the values should be strings not null or undefined
    kasittelynTila.ensimmainenJatkopaatos = {
      paatoksenPvm: projekti.kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm || null,
      asianumero: projekti.kasittelynTila?.ensimmainenJatkopaatos?.asianumero || "",
    };
    //TODO When the input fields are enabled, the values should be strings not null or undefined
    kasittelynTila.toinenJatkopaatos = {
      paatoksenPvm: null,
      asianumero: undefined,
    };
    kasittelynTila.suunnitelmanTila = projekti.kasittelynTila?.suunnitelmanTila || "";
    kasittelynTila.hyvaksymisesitysTraficomiinPaiva = projekti.kasittelynTila?.hyvaksymisesitysTraficomiinPaiva || null;
    kasittelynTila.ennakkoneuvotteluPaiva = projekti.kasittelynTila?.ennakkoneuvotteluPaiva || null;
    kasittelynTila.valitustenMaara = projekti.kasittelynTila?.valitustenMaara || null;
    kasittelynTila.lainvoimaAlkaen = projekti.kasittelynTila?.lainvoimaAlkaen || null;
    kasittelynTila.lainvoimaPaattyen = projekti.kasittelynTila?.lainvoimaPaattyen || null;
    kasittelynTila.ennakkotarkastus = projekti.kasittelynTila?.ennakkotarkastus || null;
    kasittelynTila.toimitusKaynnistynyt = projekti.kasittelynTila?.toimitusKaynnistynyt || null;
    kasittelynTila.liikenteeseenluovutusOsittain = projekti.kasittelynTila?.liikenteeseenluovutusOsittain || null;
    kasittelynTila.liikenteeseenluovutusKokonaan = projekti.kasittelynTila?.liikenteeseenluovutusKokonaan || null;
    kasittelynTila.lisatieto = projekti.kasittelynTila?.lisatieto || null;
    kasittelynTila.hallintoOikeus = projekti.kasittelynTila?.hallintoOikeus || null;
    kasittelynTila.korkeinHallintoOikeus = projekti.kasittelynTila?.korkeinHallintoOikeus || null;

    const formValues: FormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      kasittelynTila,
    };
    return formValues;
  }, [projekti]);

  const isFormDisabled = disableAdminOnlyFields && hyvaksymispaatosDisabled;
  const ensimmainenJatkopaatosDisabled = disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.EPAAKTIIVINEN_1);
  const toinenJatkopaatosDisabled = disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.EPAAKTIIVINEN_2);

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(kasittelynTilaSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    shouldUnregister: true, //<-
    context: { projekti },
  };

  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    control,
    reset,
    watch,
    setValue,
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const api = useApi();

  const onSubmit = useCallback(
    async (data: FormValues) => {
      setIsFormSubmitting(true);
      try {
        const values = removeEmptyValues(data);
        console.log(values);
        await api.tallennaProjekti(values);
        await reloadProjekti();
        showSuccessMessage("Tallennus onnistui!");
      } catch (e) {
        log.log("OnSubmit Error", e);
        showErrorMessage("Tallennuksessa tapahtui virhe!");
      }
      setIsFormSubmitting(false);
    },
    [api, reloadProjekti, showErrorMessage, showSuccessMessage]
  );

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const avaaJatkopaatos = useCallback(
    async (data: FormValues) => {
      setIsFormSubmitting(true);
      try {
        data.kasittelynTila!.ensimmainenJatkopaatos!.aktiivinen = true;
        await onSubmit(data);
        showSuccessMessage("Jatkopäätös lisätty!");
      } catch (e) {
        log.log("OnSubmit Error", e);
        showErrorMessage("Tallennuksessa tapahtui virhe!");
      }
      setIsFormSubmitting(false);
      setOpenTallenna(false);
      const siirtymaTimer = setTimeout(() => {
        router.push(`/yllapito/projekti/${projekti.oid}/henkilot`);
      }, 1500);
      return () => clearTimeout(siirtymaTimer);
    },
    [onSubmit, showSuccessMessage, showErrorMessage, router, projekti.oid]
  );

  const handleClickOpenTallenna = () => {
    setOpenTallenna(true);
  };
  const handleClickCloseTallenna = () => {
    setOpenTallenna(false);
  };

  const handleClickTallennaJaAvaa = useMemo(() => {
    return handleSubmit(avaaJatkopaatos);
  }, [avaaJatkopaatos, handleSubmit]);

  const jatkopaatos1Pvm = watch("kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm");
  const jatkopaatos1Asiatunnus = watch("kasittelynTila.ensimmainenJatkopaatos.asianumero");
  const jatkopaatos1lisaaDisabled = ensimmainenJatkopaatosDisabled || !jatkopaatos1Pvm || !jatkopaatos1Asiatunnus;
  const velhoURL = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + projekti.oid;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Section>
          <p>
            Pääkäyttäjä lisää sivulle tietoa suunnitelman hallinnollisellisen käsittelyn tiloista, jotka ovat nähtävissä lukutilassa muille
            järjestelmän käyttäjille. Tiedot siirtyvät Käsittelyn tila -sivulta <ExtLink href={velhoURL}>Projektivelhoon</ExtLink>.
          </p>
          <SectionContent>
            {!isFormDisabled && <input type="hidden" {...register("oid")} />}
            {!isFormDisabled && <input type="hidden" {...register("versio")} />}
            <h5 className="vayla-subtitle">Suunnitelman tila</h5>
            <p>Suunnitelman tilatieto siirtyy automaattisesti Projektivelhoon.</p>
            <HassuGrid cols={{ lg: 2 }}>
              {projekti.nykyinenKayttaja.onYllapitaja ? (
                <Controller
                  control={control}
                  name="kasittelynTila.suunnitelmanTila"
                  render={({ field: { value, onChange, ...field } }) => (
                    <Select
                      id="suunnitelmanTila"
                      label="Suunnitelman tila"
                      options={Object.entries(suunnitelmanTilat)
                        .map(([key, value]) => {
                          return { label: value, value: key };
                        })
                        .sort((option1, option2) => (option1.label > option2.label ? 1 : -1))}
                      disabled={disableAdminOnlyFields}
                      addEmptyOption
                      value={value || ""}
                      onChange={(event) => onChange(event.target.value)}
                      {...field}
                    />
                  )}
                />
              ) : (
                <Select
                  id="suunnitelmanTila"
                  label="Suunnitelman tila"
                  options={Object.entries(suunnitelmanTilat)
                    .map(([key, value]) => {
                      return { label: value, value: key };
                    })
                    .sort((option1, option2) => (option1.label > option2.label ? 1 : -1))}
                  addEmptyOption
                  value={projekti.kasittelynTila?.suunnitelmanTila || ""}
                  disabled
                />
              )}
            </HassuGrid>
          </SectionContent>
        </Section>
        <Section>
          <SectionContent>
            <h5 className="vayla-subtitle">Hyväksymiskäsittelyn tila</h5>
            <p className="mt-6">
              Anna päivämäärä, jolloin suunnitelma on ennakkotarkastuksessa Väylävirastossa, se on ennakkoneuvotteluissa ja mennyt
              hyväksymisesityksenä Traficomiin.
            </p>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label="Ennakkotarkastus"
                controllerProps={{ control, name: "kasittelynTila.ennakkotarkastus" }}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja}
                disabled={disableAdminOnlyFields}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.ennakkotarkastus)}
              />
              <DatePickerConditionallyInTheForm
                label="Ennakkoneuvottelu"
                disabled={disableAdminOnlyFields}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja}
                controllerProps={{ control, name: "kasittelynTila.ennakkoneuvotteluPaiva" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.ennakkoneuvotteluPaiva)}
              />
            </HassuGrid>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label="Hyväksymisesitys Traficomiin"
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja}
                disabled={disableAdminOnlyFields}
                controllerProps={{ control, name: "kasittelynTila.hyvaksymisesitysTraficomiinPaiva" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.hyvaksymisesitysTraficomiinPaiva)}
              />
            </HassuGrid>
          </SectionContent>
        </Section>
        <Section>
          <SectionContent>
            <h5 className="vayla-subtitle">Hyväksymispäätös</h5>
            <p>
              Anna päivämäärä, jolloin suunnitelma on saanut hyväksymispäätöksen sekä päätöksen asiatunnuksen. Päätöksen päivä ja asiatunnus
              siirtyvät suunnitelman hyväksymispäätöksen kuulutukselle.
            </p>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label={`Päätöksen päivä ${projekti.kasittelynTila?.hyvaksymispaatos?.aktiivinen ? "*" : ""}`}
                includeInForm={projekti.nykyinenKayttaja.onProjektipaallikko}
                disabled={hyvaksymispaatosDisabled}
                controllerProps={{ control, name: "kasittelynTila.hyvaksymispaatos.paatoksenPvm" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm)}
              />
              <TextInput
                label={`Asiatunnus ${projekti.kasittelynTila?.hyvaksymispaatos?.aktiivinen ? "*" : ""}`}
                {...register("kasittelynTila.hyvaksymispaatos.asianumero")}
                disabled={hyvaksymispaatosDisabled}
                error={(errors as any).kasittelynTila?.hyvaksymispaatos?.asianumero}
              />
            </HassuGrid>
          </SectionContent>
          <SectionContent>
            <h6 className="vayla-smallest-title">Valitukset</h6>
            <p>Valitse ‘Kyllä’, jos hyväksymispäätöksestä on valitettu hallinto-oikeuteen.</p>
            {projekti.nykyinenKayttaja.onYllapitaja ? (
              <Controller
                control={control}
                name="kasittelynTila.valitustenMaara"
                render={({ field: { value, ...field }, fieldState }) => {
                  const showTextInput = value !== null && value !== undefined;
                  const toggleTextInput = () => {
                    const nextValue = showTextInput ? null : "";
                    setValue("kasittelynTila.valitustenMaara", nextValue as any, { shouldValidate: false });
                  };
                  return (
                    <>
                      <CheckBox
                        label="Kyllä, anna valitusten lukumäärä"
                        onChange={toggleTextInput}
                        disabled={disableAdminOnlyFields}
                        checked={showTextInput}
                        id="valituksetCheckbox"
                      />
                      <HassuGrid cols={{ lg: 3 }}>
                        {showTextInput && (
                          <TextInput
                            type="number"
                            label="Valitusten lukumäärä *"
                            disabled={disableAdminOnlyFields}
                            {...field}
                            value={value || ""}
                            error={fieldState.error}
                          />
                        )}
                      </HassuGrid>
                    </>
                  );
                }}
              />
            ) : (
              <>
                <CheckBox label="Kyllä, anna valitusten lukumäärä" disabled checked={!!projekti.kasittelynTila?.valitustenMaara} />
                <HassuGrid cols={{ lg: 3 }}>
                  {projekti.kasittelynTila?.valitustenMaara && (
                    <TextInput
                      type="number"
                      label="Valitusten lukumäärä *"
                      disabled
                      value={projekti.kasittelynTila?.valitustenMaara || ""}
                    />
                  )}
                </HassuGrid>
              </>
            )}
          </SectionContent>
        </Section>
        <Section>
          <SectionContent>
            <h5 className="vayla-subtitle">Lainvoima</h5>
            <p>
              Anna päivämäärä, jolloin suunnitelma on saanut lainvoiman ja päivämäärä, jolloin lainvoimaisuus päättyy. Jatkopäätösten
              yhteydessä Lainvoima alkaen -päivämäärä pysyy samana ja Lainvoima päätten -päivämäärää siirretään päättyvän myöhäisemmäksi.
            </p>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label="Lainvoima alkaen"
                disabled={disableAdminOnlyFields}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja}
                controllerProps={{ control, name: "kasittelynTila.lainvoimaAlkaen" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.lainvoimaAlkaen)}
              />
              <DatePickerConditionallyInTheForm
                label="Lainvoima päättyen"
                disabled={disableAdminOnlyFields}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja}
                controllerProps={{ control, name: "kasittelynTila.lainvoimaPaattyen" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.lainvoimaPaattyen)}
              />
            </HassuGrid>
          </SectionContent>
        </Section>
        <Section>
          <SectionContent>
            <h5 className="vayla-subtitle">Väylätoimitus</h5>
            <p className="mt-6">Anna päivämäärä, jolloin maantietoimitus tai ratatoimitus on käynnistynyt.</p>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label="Toimitus käynnistynyt"
                disabled={disableAdminOnlyFields}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja}
                controllerProps={{ control, name: "kasittelynTila.toimitusKaynnistynyt" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.toimitusKaynnistynyt)}
              />
            </HassuGrid>
          </SectionContent>
          <SectionContent>
            <h5 className="vayla-small-title">Liikenteelleluovutus tai ratasuunnitelman toteutusilmoitus</h5>
            <p>
              Pääkäyttäjä lisää sivulle tietoa suunnitelman hallinnollisellisen käsittelyn tiloista, jotka ovat nähtävissä lukutilassa
              muille järjestelmän käyttäjille. Tiedot siirtyvät Käsittelyn tila -sivulta Projektivelhoon.
            </p>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label="Osaluovutus"
                disabled={disableAdminOnlyFields}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja}
                controllerProps={{ control, name: "kasittelynTila.liikenteeseenluovutusOsittain" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.liikenteeseenluovutusOsittain)}
              />
              <HassuGridItem sx={{ alignSelf: "end" }}>
                <Button id="lisaa_osaluovutus" onClick={() => console.log("not implemented")} disabled={true}>
                  Lisää uusi+
                </Button>
              </HassuGridItem>
            </HassuGrid>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label="Kokoluovutus"
                disabled={disableAdminOnlyFields}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja}
                controllerProps={{ control, name: "kasittelynTila.liikenteeseenluovutusKokonaan" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.liikenteeseenluovutusKokonaan)}
              />
            </HassuGrid>
          </SectionContent>
        </Section>
        <Section>
          <SectionContent>
            <h5 className="vayla-small-title">Jatkopäätös</h5>
            <p>
              Anna päivämäärä, jolloin suunnitelma on saanut jatkopäätöksen sekä päätöksen asiatunnus ja paina ‘Lisää jatkopäätös’. Toiminto
              avaa suunnitelmalle jatkopäätöksen kuulutuksen. Tarkasta jatkopäätöksen lisäämisen jälkeen Projektivelhosta suunnitelman
              projektipäällikön tiedot ajantasalle.
            </p>
            <p>Toisen jatkopäätöksen päivämäärä ja asiatunnus avautuvat, kun ensimmäisen jatkopäätöksen kuulutusaika on päättynyt.</p>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label={`1. jatkopäätöksen päivä ${projekti.kasittelynTila?.ensimmainenJatkopaatos?.aktiivinen ? "*" : ""}`}
                controllerProps={{ control, name: "kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm" }}
                disabled={ensimmainenJatkopaatosDisabled}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja && isProjektiStatusGreaterOrEqualTo(projekti, Status.EPAAKTIIVINEN_1)}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm)}
              />
              {projekti.nykyinenKayttaja.onYllapitaja && isProjektiStatusGreaterOrEqualTo(projekti, Status.EPAAKTIIVINEN_1) ? (
                <TextInput
                  label={`Asiatunnus ${projekti.kasittelynTila?.ensimmainenJatkopaatos?.aktiivinen ? "*" : ""}`}
                  {...register("kasittelynTila.ensimmainenJatkopaatos.asianumero")}
                  error={(errors as any).kasittelynTila?.ensimmainenJatkopaatos?.asianumero}
                  disabled={ensimmainenJatkopaatosDisabled}
                />
              ) : (
                <TextInput label="Asiatunnus" value={projekti.kasittelynTila?.ensimmainenJatkopaatos?.asianumero || ""} disabled />
              )}
              {!projekti.kasittelynTila?.ensimmainenJatkopaatos?.aktiivinen && (
                <HassuGridItem sx={{ alignSelf: "end" }}>
                  <Button id="lisaa_jatkopaatos" onClick={handleSubmit(handleClickOpenTallenna)} disabled={jatkopaatos1lisaaDisabled}>
                    Lisää jatkopäätös
                  </Button>
                </HassuGridItem>
              )}
              <LuoJatkopaatosDialog isOpen={openTallenna} onClose={handleClickCloseTallenna} tallenna={handleClickTallennaJaAvaa} />
            </HassuGrid>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label={`2. jatkopäätöksen päivä ${projekti.kasittelynTila?.toinenJatkopaatos?.aktiivinen ? "*" : ""}`}
                disabled={toinenJatkopaatosDisabled}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja && isProjektiStatusGreaterOrEqualTo(projekti, Status.EPAAKTIIVINEN_2)}
                controllerProps={{ control, name: "kasittelynTila.toinenJatkopaatos.paatoksenPvm" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.toinenJatkopaatos?.paatoksenPvm)}
              />
              {projekti.nykyinenKayttaja.onYllapitaja && isProjektiStatusGreaterOrEqualTo(projekti, Status.EPAAKTIIVINEN_2) ? (
                <TextInput
                  label={`Asiatunnus ${projekti.kasittelynTila?.toinenJatkopaatos?.aktiivinen ? "*" : ""}`}
                  {...register("kasittelynTila.toinenJatkopaatos.asianumero")}
                  disabled={toinenJatkopaatosDisabled}
                  error={(errors as any).kasittelynTila?.toinenJatkopaatos?.asianumero}
                />
              ) : (
                <TextInput label="Asiatunnus" value={projekti.kasittelynTila?.toinenJatkopaatos?.asianumero || ""} disabled />
              )}
            </HassuGrid>
          </SectionContent>
        </Section>
        <Section>
          <Controller
            control={control}
            name="kasittelynTila.hallintoOikeus"
            shouldUnregister={false}
            render={({ field: { value, onChange }, fieldState }) => {
              return (
                <SectionContent>
                  <h5 className="vayla-subtitle">Hallinto-oikeus</h5>
                  <h4 className="vayla-small-title mt-6 mb-6">Hallinto-oikeuden välipäätös</h4>
                  {fieldState.error?.message && <p className="text-red mb-6">{fieldState.error?.message}</p>}
                  <HassuDatePicker
                    textFieldProps={{ name: "kasittelynTila.hallintoOikeus.valipaatos.paiva" }}
                    label="Päivämäärä"
                    disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                    onChange={(date: Dayjs | null, keyboardInputValue?: string | undefined) => {
                      const dateStr: null | string = date === null ? null : dayjs(date).format("YYYY-MM-DD");
                      onChange({
                        ...value,
                        valipaatos: {
                          paiva: dateStr ? dateStr : keyboardInputValue ? keyboardInputValue : null,
                          sisalto: value?.valipaatos?.sisalto,
                        },
                      });
                    }}
                    value={
                      value?.valipaatos?.paiva === null || value?.valipaatos?.paiva === undefined ? null : dayjs(value?.valipaatos?.paiva)
                    }
                  />
                  <div style={{ width: "80%" }}>
                    <Textarea
                      label={"Hallinto-oikeuden välipäätöksen sisältö"}
                      name="kasittelynTila.hallintoOikeus.valipaatos.sisalto"
                      disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                      value={value?.valipaatos?.sisalto || ""}
                      onChange={(e) => {
                        onChange({
                          ...value,
                          valipaatos: {
                            paiva: value?.valipaatos?.paiva,
                            sisalto: e.target.value,
                          },
                        });
                      }}
                      error={(errors as any).kasittelynTila?.hallintoOikeus?.valipaatos?.sisalto}
                      maxLength={2000}
                      minRows={3}
                    ></Textarea>
                  </div>
                  <h4 className="vayla-small-title mb-6">Hallinto-oikeuden päätös</h4>
                  <HassuDatePicker
                    textFieldProps={{ name: "kasittelynTila.hallintoOikeus.paatos.paiva" }}
                    label="Päivämäärä"
                    disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                    onChange={(date: Dayjs | null, keyboardInputValue?: string | undefined) => {
                      const dateStr: null | string = date === null ? null : dayjs(date).format("YYYY-MM-DD");
                      onChange({
                        ...value,
                        paatos: {
                          paiva: dateStr ? dateStr : keyboardInputValue ? keyboardInputValue : null,
                          sisalto: value?.paatos?.sisalto,
                        },
                      });
                    }}
                    value={value?.paatos?.paiva === null || value?.paatos?.paiva === undefined ? null : dayjs(value?.paatos?.paiva)}
                  />
                  <div style={{ width: "80%" }}>
                    <Textarea
                      label={"Hallinto-oikeuden päätöksen sisältö"}
                      name="kasittelynTila.hallintoOikeus.paatos.sisalto"
                      disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                      value={value?.paatos?.sisalto || ""}
                      onChange={(e) => {
                        onChange({
                          ...value,
                          paatos: {
                            paiva: value?.paatos?.paiva,
                            sisalto: e.target.value,
                          },
                        });
                      }}
                      error={(errors as any).kasittelynTila?.hallintoOikeus?.paatos?.sisalto}
                      maxLength={2000}
                      minRows={3}
                    ></Textarea>
                  </div>

                  <FormGroupWithBoldLabel
                    label={"Hyväksymispäätös kumottu"}
                    errorMessage={
                      errors?.kasittelynTila && (errors?.kasittelynTila as any).hallintoOikeus?.hyvaksymisPaatosKumottu?.message
                    }
                    flexDirection="col"
                  >
                    <RadioButton
                      id="hoHyvaksymisPaatosKumottuKylla"
                      label={"Kyllä"}
                      disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                      checked={!!value?.hyvaksymisPaatosKumottu}
                      onChange={() => {
                        onChange({
                          ...value,
                          hyvaksymisPaatosKumottu: true,
                        });
                      }}
                    />
                    <RadioButton
                      id="hoHyvaksymisPaatosKumottuEi"
                      label="Ei"
                      disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                      checked={value?.hyvaksymisPaatosKumottu === false}
                      onChange={() => {
                        onChange({
                          ...value,
                          hyvaksymisPaatosKumottu: false,
                        });
                      }}
                    />
                    <RadioButton
                      id="hoHyvaksymisPaatosKumottuEiTiedossa"
                      label="Ei tiedossa"
                      disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                      checked={value?.hyvaksymisPaatosKumottu === null || value?.hyvaksymisPaatosKumottu === undefined}
                      onChange={() => {
                        onChange({
                          valipaatos: {
                            paiva: null,
                            sisalto: null,
                          },
                          paatos: {
                            paiva: null,
                            sisalto: null,
                          },
                          hyvaksymisPaatosKumottu: undefined,
                        });
                      }}
                    />
                  </FormGroupWithBoldLabel>
                </SectionContent>
              );
            }}
          />
        </Section>
        <Section>
          <Controller
            control={control}
            name="kasittelynTila.korkeinHallintoOikeus"
            shouldUnregister={false}
            render={({ field: { value, onChange }, fieldState }) => {
              return (
                <SectionContent>
                  <h5 className="vayla-subtitle">Korkein hallinto-oikeus</h5>
                  <h4 className="vayla-small-title mt-6 mb-6">Korkeimman hallinto-oikeuden välipäätös</h4>
                  {fieldState.error?.message && <p className="text-red mb-6">{fieldState.error?.message}</p>}
                  <HassuDatePicker
                    label="Päivämäärä"
                    textFieldProps={{ name: "kasittelynTila.korkeinHallintoOikeus.valipaatos.paiva" }}
                    disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                    onChange={(date: Dayjs | null, keyboardInputValue?: string | undefined) => {
                      const dateStr: null | string = date === null ? null : dayjs(date).format("YYYY-MM-DD");
                      onChange({
                        ...value,
                        valipaatos: {
                          paiva: dateStr ? dateStr : keyboardInputValue ? keyboardInputValue : null,
                          sisalto: value?.valipaatos?.sisalto,
                        },
                      });
                    }}
                    value={
                      value?.valipaatos?.paiva === null || value?.valipaatos?.paiva === undefined ? null : dayjs(value?.valipaatos?.paiva)
                    }
                  />
                  <div style={{ width: "80%" }}>
                    <Textarea
                      label={"Korkeimman hallinto-oikeuden välipäätöksen sisältö"}
                      name="kasittelynTila.korkeinHallintoOikeus.valipaatos.sisalto"
                      disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                      value={value?.valipaatos?.sisalto || ""}
                      onChange={(e) => {
                        onChange({
                          ...value,
                          valipaatos: {
                            paiva: value?.valipaatos?.paiva,
                            sisalto: e.target.value,
                          },
                        });
                      }}
                      error={(errors as any).kasittelynTila?.korkeinHallintoOikeus?.valipaatos?.sisalto}
                      maxLength={2000}
                      minRows={3}
                    ></Textarea>
                  </div>
                  <h4 className="vayla-small-title mb-6">Korkeimman hallinto-oikeuden päätös</h4>
                  <HassuDatePicker
                    label="Päivämäärä"
                    textFieldProps={{ name: "kasittelynTila.korkeinHallintoOikeus.paatos.paiva" }}
                    disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                    onChange={(date: Dayjs | null, keyboardInputValue?: string | undefined) => {
                      const dateStr: null | string = date === null ? null : dayjs(date).format("YYYY-MM-DD");
                      onChange({
                        ...value,
                        paatos: {
                          paiva: dateStr ? dateStr : keyboardInputValue ? keyboardInputValue : null,
                          sisalto: value?.paatos?.sisalto,
                        },
                      });
                    }}
                    value={value?.paatos?.paiva === null || value?.paatos?.paiva === undefined ? null : dayjs(value?.paatos?.paiva)}
                  />
                  <div style={{ width: "80%" }}>
                    <Textarea
                      label={"Korkeimman hallinto-oikeuden päätöksen sisältö"}
                      name="kasittelynTila.korkeinHallintoOikeus.paatos.sisalto"
                      disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                      value={value?.paatos?.sisalto || ""}
                      onChange={(e) => {
                        onChange({
                          ...value,
                          paatos: {
                            paiva: value?.paatos?.paiva,
                            sisalto: e.target.value,
                          },
                        });
                      }}
                      error={(errors as any).kasittelynTila?.korkeinHallintoOikeus?.paatos?.sisalto}
                      maxLength={2000}
                      minRows={3}
                    ></Textarea>
                  </div>

                  <FormGroupWithBoldLabel
                    label={"Hyväksymispäätös kumottu"}
                    errorMessage={
                      errors?.kasittelynTila && (errors?.kasittelynTila as any).korkeinHallintoOikeus?.hyvaksymisPaatosKumottu?.message
                    }
                    flexDirection="col"
                  >
                    <RadioButton
                      id="khoHyvaksymisPaatosKumottuKyllä"
                      label={"Kyllä"}
                      disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                      checked={!!value?.hyvaksymisPaatosKumottu}
                      onChange={() => {
                        onChange({
                          ...value,
                          hyvaksymisPaatosKumottu: true,
                        });
                      }}
                    />
                    <RadioButton
                      id="khoHyvaksymisPaatosKumottuEi"
                      label="Ei"
                      disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                      checked={value?.hyvaksymisPaatosKumottu === false}
                      onChange={() => {
                        onChange({
                          ...value,
                          hyvaksymisPaatosKumottu: false,
                        });
                      }}
                    />
                    <RadioButton
                      id="khoHyvaksymisPaatosKumottuEiTiedossa"
                      label="Ei tiedossa"
                      disabled={disableAdminOnlyFields || !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO)}
                      checked={value?.hyvaksymisPaatosKumottu === null || value?.hyvaksymisPaatosKumottu === undefined}
                      onChange={() => {
                        onChange({
                          valipaatos: {
                            paiva: null,
                            sisalto: null,
                          },
                          paatos: {
                            paiva: null,
                            sisalto: null,
                          },
                          hyvaksymisPaatosKumottu: undefined,
                        });
                      }}
                    />
                  </FormGroupWithBoldLabel>
                </SectionContent>
              );
            }}
          />
        </Section>
        <Section>
          <SectionContent>
            <h5 className="vayla-subtitle">Lisätietoa käsittelyn tilasta</h5>
            <HassuGrid className="mt-6" cols={{ lg: 1 }}>
              {projekti.nykyinenKayttaja.onYllapitaja ? (
                <Textarea
                  disabled={disableAdminOnlyFields}
                  {...register("kasittelynTila.lisatieto")}
                  error={(errors as any).kasittelynTila?.lisatieto}
                ></Textarea>
              ) : (
                <Textarea disabled value={projekti.kasittelynTila?.lisatieto || ""}></Textarea>
              )}
            </HassuGrid>
          </SectionContent>
        </Section>
        <Section noDivider>
          <HassuStack alignItems="flex-end">
            <Button id="save" primary disabled={isFormDisabled}>
              Tallenna
            </Button>
          </HassuStack>
        </Section>
      </form>
      <HassuSpinner open={isFormSubmitting || isLoadingProjekti} />
    </>
  );
}

const DatePickerConditionallyInTheForm: VFC<HassuDatePickerWithControllerProps<FormValues> & { includeInForm: boolean }> = ({
  controllerProps,
  value,
  includeInForm,
  ...props
}) => {
  if (!includeInForm) {
    return <HassuDatePicker {...props} value={value} />;
  }
  return <HassuDatePickerWithController {...props} controllerProps={controllerProps} />;
};
