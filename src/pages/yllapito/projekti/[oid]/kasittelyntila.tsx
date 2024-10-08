import React, { ReactElement, useCallback, useMemo, useEffect, FunctionComponent } from "react";
import { JatkopaatettavaVaihe, KasittelyntilaInput, OikeudenPaatosInput, Status, TallennaProjektiInput } from "@services/api";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import { Controller, FormProvider, useForm, UseFormProps } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
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
import TextInput from "@components/form/TextInput";
import KasittelyntilaLukutila from "@components/projekti/lukutila/KasittelynTilaLukutila";
import { formatDate, parseValidDateOtherwiseReturnNull } from "hassu-common/util/dateUtils";
import Select from "@components/form/Select";
import { suunnitelmanTilat } from "hassu-common/generated/kasittelynTila";
import Textarea from "@components/form/Textarea";
import useApi from "src/hooks/useApi";
import dayjs from "dayjs";
import { isStatusGreaterOrEqualTo, isStatusLessOrEqualTo } from "hassu-common/statusOrder";
import HallintoOikeus from "@components/projekti/kasittelyntila/HallintoOikeus";
import KorkeinHallintoOikeus from "@components/projekti/kasittelyntila/KorkeinHallintoOikeus";
import cloneDeep from "lodash/cloneDeep";
import HassuMuiSelect from "@components/form/HassuMuiSelect";
import { Checkbox, FormControlLabel, MenuItem } from "@mui/material";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { getVelhoUrl } from "../../../../util/velhoUtils";
import { H2, H3 } from "../../../../components/Headings";
import { PalautaAktiiviseksiButton } from "@components/projekti/PalautaAktiiviseksiButton";

export type KasittelynTilaFormValues = Pick<TallennaProjektiInput, "oid" | "versio" | "kasittelynTila">;

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

  const jatkopaatettavaVaihe: JatkopaatettavaVaihe | null = useMemo(() => {
    if (projekti?.status === Status.EPAAKTIIVINEN_1) {
      return JatkopaatettavaVaihe.JATKOPAATOS_1;
    } else if (projekti?.status === Status.EPAAKTIIVINEN_2) {
      return JatkopaatettavaVaihe.JATKOPAATOS_2;
    } else {
      return null;
    }
  }, [projekti?.status]);

  const showPalautaAktiiviseksi = jatkopaatettavaVaihe && projekti?.nykyinenKayttaja.onYllapitaja;

  return (
    <ProjektiPageLayout
      title="Käsittelyn tila"
      contentAsideTitle={
        showPalautaAktiiviseksi && (
          <PalautaAktiiviseksiButton projekti={projekti} jatkopaatettavaVaihe={jatkopaatettavaVaihe} reloadProjekti={reloadProjekti} />
        )
      }
    >
      {projekti && onEpaAktivoitumassa && projekti.nykyinenKayttaja.omaaMuokkausOikeuden && (
        <Notification type={NotificationType.INFO_GRAY}>
          Suunnitelma muuttuu epäaktiivikseksi {formatDate(epaAktivoitumisPvm)}. Samalla kun suunnitelma muuttuu epäaktiivikseksi, projektin
          jäseniltä päättyvät muokkausoikeudet suunnitelmaan ja suunnitelman aineistot poistetaan järjestelmästä. Huolehdithan, että kaikki
          tarvittavat asiakirjat on tallennettu asianhallintaan ja muihin tallennuspaikkoihin ennen muokkausoikeuksien päättymistä.
        </Notification>
      )}
      {projekti &&
        (!projekti?.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo ? (
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

function removeEmptyValues(data: KasittelynTilaFormValues): KasittelynTilaFormValues {
  if (data.kasittelynTila) {
    const kasittelynTila: KasittelyntilaInput = cloneDeep(data.kasittelynTila);
    if (data.kasittelynTila.hallintoOikeus) {
      kasittelynTila.hallintoOikeus =
        typeof kasittelynTila.hallintoOikeus?.hyvaksymisPaatosKumottu === "boolean"
          ? {
              hyvaksymisPaatosKumottu: kasittelynTila.hallintoOikeus.hyvaksymisPaatosKumottu,
              valipaatos: {
                paiva: kasittelynTila.hallintoOikeus.valipaatos?.paiva,
                sisalto: kasittelynTila.hallintoOikeus.valipaatos?.sisalto,
              },
              paatos: {
                paiva: kasittelynTila.hallintoOikeus.paatos?.paiva,
                sisalto: kasittelynTila.hallintoOikeus.paatos?.sisalto,
              },
            }
          : null;
    }
    if (data.kasittelynTila.korkeinHallintoOikeus) {
      kasittelynTila.korkeinHallintoOikeus =
        typeof kasittelynTila.korkeinHallintoOikeus?.hyvaksymisPaatosKumottu === "boolean"
          ? {
              hyvaksymisPaatosKumottu: kasittelynTila.korkeinHallintoOikeus.hyvaksymisPaatosKumottu,
              valipaatos: {
                paiva: kasittelynTila.korkeinHallintoOikeus.valipaatos?.paiva,
                sisalto: kasittelynTila.korkeinHallintoOikeus.valipaatos?.sisalto,
              },
              paatos: {
                paiva: kasittelynTila.korkeinHallintoOikeus.paatos?.paiva,
                sisalto: kasittelynTila.korkeinHallintoOikeus.paatos?.sisalto,
              },
            }
          : null;
    }
    return {
      ...data,
      kasittelynTila,
    };
  }
  return data;
}

function KasittelyntilaPageContent({ projekti, projektiLoadError, reloadProjekti }: Readonly<HenkilotFormProps>): ReactElement {
  const { isLoading: isFormSubmitting, withLoadingSpinner } = useLoadingSpinner();

  const isLoadingProjekti = !projekti && !projektiLoadError;

  const disableAdminOnlyFields = !projekti?.nykyinenKayttaja.onYllapitaja || !!projektiLoadError || isLoadingProjekti || isFormSubmitting;

  const hyvaksymispaatosDisabled =
    !projekti.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo ||
    !!projektiLoadError ||
    isLoadingProjekti ||
    isFormSubmitting ||
    !isStatusGreaterOrEqualTo(projekti.status, Status.NAHTAVILLAOLO);

  const defaultValues: KasittelynTilaFormValues = useMemo(() => {
    const kasittelynTila: KasittelyntilaInput = {
      hyvaksymispaatos: {
        paatoksenPvm: projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm
          ? projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm
          : null,
        asianumero: projekti.kasittelynTila?.hyvaksymispaatos?.asianumero ?? "",
      },
    };

    if (projekti.nykyinenKayttaja.onYllapitaja) {
      if (isStatusGreaterOrEqualTo(projekti.status, Status.EPAAKTIIVINEN_1)) {
        kasittelynTila.ensimmainenJatkopaatos = {
          paatoksenPvm: projekti.kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm
            ? projekti.kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm
            : null,
          asianumero: projekti.kasittelynTila?.ensimmainenJatkopaatos?.asianumero ?? "",
        };
      }
      if (isStatusGreaterOrEqualTo(projekti.status, Status.EPAAKTIIVINEN_2)) {
        kasittelynTila.toinenJatkopaatos = {
          paatoksenPvm: projekti.kasittelynTila?.toinenJatkopaatos?.paatoksenPvm
            ? projekti.kasittelynTila?.toinenJatkopaatos?.paatoksenPvm
            : null,
          asianumero: projekti.kasittelynTila?.toinenJatkopaatos?.asianumero ?? "",
        };
      }
      kasittelynTila.suunnitelmanTila = projekti.kasittelynTila?.suunnitelmanTila ?? "";
      kasittelynTila.hyvaksymisesitysTraficomiinPaiva = projekti.kasittelynTila?.hyvaksymisesitysTraficomiinPaiva ?? null;
      kasittelynTila.ennakkoneuvotteluPaiva = projekti.kasittelynTila?.ennakkoneuvotteluPaiva ?? null;
      kasittelynTila.valitustenMaara = projekti.kasittelynTila?.valitustenMaara ?? null;
      kasittelynTila.lainvoimaAlkaen = projekti.kasittelynTila?.lainvoimaAlkaen ?? null;
      kasittelynTila.lainvoimaPaattyen = projekti.kasittelynTila?.lainvoimaPaattyen ?? null;
      kasittelynTila.ennakkotarkastus = projekti.kasittelynTila?.ennakkotarkastus ?? null;
      kasittelynTila.toimitusKaynnistynyt = projekti.kasittelynTila?.toimitusKaynnistynyt ?? null;
      kasittelynTila.liikenteeseenluovutusOsittain = projekti.kasittelynTila?.liikenteeseenluovutusOsittain ?? null;
      kasittelynTila.liikenteeseenluovutusKokonaan = projekti.kasittelynTila?.liikenteeseenluovutusKokonaan ?? null;
      kasittelynTila.lisatieto = projekti.kasittelynTila?.lisatieto ?? null;
      kasittelynTila.toteutusilmoitusOsittain = projekti.kasittelynTila?.toteutusilmoitusOsittain ?? null;
      kasittelynTila.toteutusilmoitusKokonaan = projekti.kasittelynTila?.toteutusilmoitusKokonaan ?? null;
      if (isStatusGreaterOrEqualTo(projekti.status, Status.NAHTAVILLAOLO)) {
        kasittelynTila.hallintoOikeus =
          projekti.kasittelynTila?.hallintoOikeus ??
          ({
            valipaatos: null,
            paatos: null,
            hyvaksymisPaatosKumottu: undefined,
          } as any as OikeudenPaatosInput); //Pakotettu, jotta lomake toimii oikein
        kasittelynTila.korkeinHallintoOikeus =
          projekti.kasittelynTila?.korkeinHallintoOikeus ??
          ({
            valipaatos: null,
            paatos: null,
            hyvaksymisPaatosKumottu: undefined,
          } as any as OikeudenPaatosInput); //Pakotettu, jotta lomake toimii oikein
      }
    }
    const formValues: KasittelynTilaFormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      kasittelynTila,
    };
    return formValues;
  }, [projekti]);

  const isFormDisabled = disableAdminOnlyFields && hyvaksymispaatosDisabled;
  const ensimmainenJatkopaatosDisabled =
    disableAdminOnlyFields ||
    !(isStatusGreaterOrEqualTo(projekti.status, Status.EPAAKTIIVINEN_1) && isStatusLessOrEqualTo(projekti.status, Status.JATKOPAATOS_1));
  const toinenJatkopaatosDisabled = disableAdminOnlyFields || !isStatusGreaterOrEqualTo(projekti.status, Status.EPAAKTIIVINEN_2);

  const formOptions: UseFormProps<KasittelynTilaFormValues, ProjektiValidationContext> = {
    resolver: yupResolver(kasittelynTilaSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    shouldUnregister: true,
    context: { projekti },
  };

  const { showSuccessMessage } = useSnackbars();

  const useFormReturn = useForm<KasittelynTilaFormValues, ProjektiValidationContext>(formOptions);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    control,
    reset,
    setValue,
    trigger,
  } = useFormReturn;

  useLeaveConfirm(!isSubmitting && isDirty);

  const api = useApi();

  const save = useCallback(
    async (data: KasittelynTilaFormValues, successMessage: string) => {
      try {
        const values = removeEmptyValues(data);
        await api.tallennaProjekti(values);
        await reloadProjekti();
        // varmistetaan että isDirty menee false:ksi
        reset(undefined, { keepValues: true });
        showSuccessMessage(successMessage);
      } catch (e) {
        log.log("OnSubmit Error", e);
      }
    },
    [api, reloadProjekti, reset, showSuccessMessage]
  );

  const onSubmit = useCallback(
    (data: KasittelynTilaFormValues) => withLoadingSpinner(save(data, "Tallennus onnistui")),
    [save, withLoadingSpinner]
  );

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const velhoURL = getVelhoUrl(projekti.oid);

  const jatkopaatos1TiedotPakollisia =
    projekti.kasittelynTila?.ensimmainenJatkopaatos?.aktiivinen &&
    projekti.kasittelynTila?.ensimmainenJatkopaatos?.asianumero &&
    projekti.kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm;

  const jatkopaatos2AnnettuTiedot =
    projekti.kasittelynTila?.toinenJatkopaatos?.aktiivinen &&
    projekti.kasittelynTila?.toinenJatkopaatos?.asianumero &&
    projekti.kasittelynTila?.toinenJatkopaatos?.paatoksenPvm;

  return (
    <FormProvider {...useFormReturn}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Section>
          <p>
            Pääkäyttäjä lisää sivulle tietoa suunnitelman hallinnollisellisen käsittelyn tiloista, jotka ovat nähtävissä lukutilassa muille
            järjestelmän käyttäjille. Tiedot siirtyvät Käsittelyn tila -sivulta <ExtLink href={velhoURL}>Projektivelhoon</ExtLink>.
          </p>
          <SectionContent>
            {<input type="hidden" disabled={isFormDisabled} {...register("oid")} />}
            {<input type="hidden" disabled={isFormDisabled} {...register("versio")} />}
            <H2>Suunnitelman tila</H2>
            <p>Suunnitelman tilatieto siirtyy automaattisesti Projektivelhoon.</p>
            <HassuGrid cols={{ lg: 2 }}>
              {projekti.nykyinenKayttaja.onYllapitaja ? (
                <HassuMuiSelect
                  label="Suunnitelman tila"
                  control={control}
                  defaultValue=""
                  {...register("kasittelynTila.suunnitelmanTila")}
                  disabled={disableAdminOnlyFields}
                  error={(errors as any).kasittelynTila?.suunnitelmanTila}
                >
                  {Object.entries(suunnitelmanTilat)
                    .sort(([, value1], [, value2]) => (value1 > value2 ? 1 : -1))
                    .map(([key, value]) => {
                      return (
                        <MenuItem key={key} value={key}>
                          {value}
                        </MenuItem>
                      );
                    })}
                </HassuMuiSelect>
              ) : (
                <Select
                  id="suunnitelmanTila"
                  label="Suunnitelman tila"
                  options={Object.entries(suunnitelmanTilat)
                    .map(([key, value]) => {
                      return { label: value, value: key };
                    })
                    .sort((option1, option2) => (option1.label > option2.label ? 1 : -1))}
                  emptyOption="Valitse"
                  value={projekti.kasittelynTila?.suunnitelmanTila || ""}
                  disabled
                />
              )}
            </HassuGrid>
          </SectionContent>
        </Section>
        <Section>
          <SectionContent>
            <H2>Hyväksymiskäsittelyn tila</H2>
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
                onChange={() => trigger("kasittelynTila.ennakkotarkastus")}
              />
            </HassuGrid>
          </SectionContent>
        </Section>
        <Section>
          <SectionContent>
            <H2>Hyväksymispäätös</H2>
            <p>
              Anna päivämäärä, jolloin suunnitelma on saanut hyväksymispäätöksen sekä päätöksen asiatunnus. Päätöksen päivä ja asiatunnus
              siirtyvät suunnitelman hyväksymispäätöksen kuulutukselle.
            </p>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label={`Päätöksen päivä ${projekti.kasittelynTila?.hyvaksymispaatos?.aktiivinen ? "*" : ""}`}
                includeInForm={projekti.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo}
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
            <H3>Valitukset</H3>
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
                      <FormControlLabel
                        sx={{ marginLeft: "0px" }}
                        label="Kyllä, anna valitusten lukumäärä"
                        control={
                          <Checkbox
                            checked={showTextInput}
                            onChange={toggleTextInput}
                            disabled={disableAdminOnlyFields}
                            id="valituksetCheckbox"
                          />
                        }
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
                <FormControlLabel
                  sx={{ marginLeft: "0px" }}
                  label="Kyllä, anna valitusten lukumäärä"
                  control={<Checkbox checked={!!projekti.kasittelynTila?.valitustenMaara} disabled />}
                />
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
            <H2>Lainvoima</H2>
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
                onChange={() => trigger("kasittelynTila.lainvoimaPaattyen")}
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
            <H2>Väylätoimitus</H2>
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
            <H2>Liikenteelleluovutus</H2>
            <p>Anna päivämäärä, jolloin tie on Liikenteelleluovutus ilmoituksen mukaan luovutettu osittain tai kokonaan liikenteelle.</p>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label="Osaluovutus"
                disabled={disableAdminOnlyFields}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja}
                controllerProps={{ control, name: "kasittelynTila.liikenteeseenluovutusOsittain" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.liikenteeseenluovutusOsittain)}
              />
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
          <SectionContent>
            <H2>Ratasuunnitelman toteutusilmoitus</H2>
            <p>Anna päivämäärä, jolle Toteutusilmoitus on päivätty, osa tai koko toteutuksen mukaan.</p>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label="Osatoteutus"
                disabled={disableAdminOnlyFields}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja}
                controllerProps={{ control, name: "kasittelynTila.toteutusilmoitusOsittain" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.toteutusilmoitusOsittain)}
              />
            </HassuGrid>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label="Kokototeutus"
                disabled={disableAdminOnlyFields}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja}
                controllerProps={{ control, name: "kasittelynTila.toteutusilmoitusKokonaan" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.toteutusilmoitusKokonaan)}
              />
            </HassuGrid>
          </SectionContent>
        </Section>
        <Section>
          <SectionContent>
            <H2>Jatkopäätös</H2>
            <p>
              Anna päivämäärä, jolloin suunnitelma on saanut jatkopäätöksen sekä tämän asiatunnus. Kun projekti on palautettu aktiiviseksi
              jatkopäätöstä varten ja jatkopäätöksen tiedot on kertaalleen tallennettu, niitä ei voi enää poistaa, mutta niitä voidaan
              päivittää.
            </p>
            <p>Toisen jatkopäätöksen päivämäärä ja asiatunnus avautuvat, kun ensimmäisen jatkopäätöksen kuulutusaika on päättynyt.</p>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label={`1. jatkopäätöksen päivä ${jatkopaatos1TiedotPakollisia ? "*" : ""}`}
                controllerProps={{ control, name: "kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm" }}
                disabled={ensimmainenJatkopaatosDisabled}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja && isStatusGreaterOrEqualTo(projekti.status, Status.EPAAKTIIVINEN_1)}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm)}
              />
              {projekti.nykyinenKayttaja.onYllapitaja && isStatusGreaterOrEqualTo(projekti.status, Status.EPAAKTIIVINEN_1) ? (
                <TextInput
                  label={`Asiatunnus ${jatkopaatos1TiedotPakollisia ? "*" : ""}`}
                  {...register("kasittelynTila.ensimmainenJatkopaatos.asianumero")}
                  error={(errors as any).kasittelynTila?.ensimmainenJatkopaatos?.asianumero}
                  disabled={ensimmainenJatkopaatosDisabled}
                />
              ) : (
                <TextInput label="Asiatunnus" value={projekti.kasittelynTila?.ensimmainenJatkopaatos?.asianumero || ""} disabled />
              )}
            </HassuGrid>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePickerConditionallyInTheForm
                label={`2. jatkopäätöksen päivä ${jatkopaatos2AnnettuTiedot ? "*" : ""}`}
                disabled={toinenJatkopaatosDisabled}
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja && isStatusGreaterOrEqualTo(projekti.status, Status.EPAAKTIIVINEN_2)}
                controllerProps={{ control, name: "kasittelynTila.toinenJatkopaatos.paatoksenPvm" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.toinenJatkopaatos?.paatoksenPvm)}
              />
              {projekti.nykyinenKayttaja.onYllapitaja && isStatusGreaterOrEqualTo(projekti.status, Status.EPAAKTIIVINEN_2) ? (
                <TextInput
                  label={`Asiatunnus ${jatkopaatos2AnnettuTiedot ? "*" : ""}`}
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
          <HallintoOikeus
            includeInForm={projekti.nykyinenKayttaja.onYllapitaja}
            disabled={disableAdminOnlyFields || !isStatusGreaterOrEqualTo(projekti.status, Status.NAHTAVILLAOLO)}
            projekti={projekti}
          />
        </Section>
        <Section>
          <KorkeinHallintoOikeus
            includeInForm={projekti.nykyinenKayttaja.onYllapitaja}
            disabled={disableAdminOnlyFields || !isStatusGreaterOrEqualTo(projekti.status, Status.NAHTAVILLAOLO)}
            projekti={projekti}
          />
        </Section>
        <Section>
          <SectionContent>
            <H3>Lisätietoa käsittelyn tilasta</H3>
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
    </FormProvider>
  );
}

const DatePickerConditionallyInTheForm: FunctionComponent<
  HassuDatePickerWithControllerProps<KasittelynTilaFormValues> & { includeInForm: boolean }
> = ({ controllerProps, value, includeInForm, ...props }) => {
  if (!includeInForm) {
    return <HassuDatePicker {...props} value={value} />;
  }
  return <HassuDatePickerWithController {...props} controllerProps={controllerProps} />;
};
