import React, { ReactElement, useCallback, useState, useMemo, useEffect, VFC } from "react";
import { KasittelyntilaInput, OikeudenPaatosInput, Status, TallennaProjektiInput } from "@services/api";
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
import HassuGridItem from "@components/HassuGridItem";
import LuoJatkopaatosDialog from "@components/projekti/kasittelyntila/LuoJatkopaatosDialog";
import { useRouter } from "next/router";
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

function KasittelyntilaPageContent({ projekti, projektiLoadError, reloadProjekti }: HenkilotFormProps): ReactElement {
  const router = useRouter();
  const [openTallenna, setOpenTallenna] = useState(false);
  const [openTallenna2, setOpenTallenna2] = useState(false);

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
        paatoksenPvm: projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm ?? null,
        asianumero: projekti.kasittelynTila?.hyvaksymispaatos?.asianumero ?? "",
      },
    };

    kasittelynTila.ensimmainenJatkopaatos = {
      paatoksenPvm: projekti.kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm ?? null,
      asianumero: projekti.kasittelynTila?.ensimmainenJatkopaatos?.asianumero ?? "",
    };
    kasittelynTila.toinenJatkopaatos = {
      paatoksenPvm: projekti.kasittelynTila?.toinenJatkopaatos?.paatoksenPvm ?? null,
      asianumero: projekti.kasittelynTila?.toinenJatkopaatos?.asianumero ?? "",
    };
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
    shouldUnregister: true, //<-
    context: { projekti },
  };

  const { showSuccessMessage } = useSnackbars();

  const useFormReturn = useForm<KasittelynTilaFormValues, ProjektiValidationContext>(formOptions);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    control,
    reset,
    watch,
    setValue,
    trigger,
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const api = useApi();

  const onSubmit = useCallback(
    (data: KasittelynTilaFormValues) =>
      withLoadingSpinner(
        (async () => {
          try {
            const values = removeEmptyValues(data);
            await api.tallennaProjekti(values);
            await reloadProjekti();
            showSuccessMessage("Tallennus onnistui");
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
        })()
      ),
    [api, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const avaaJatkopaatos = useCallback(
    (data: KasittelynTilaFormValues) =>
      withLoadingSpinner(
        (async () => {
          try {
            data.kasittelynTila!.ensimmainenJatkopaatos!.aktiivinen = true;
            await onSubmit(data);
            showSuccessMessage("Jatkopäätös lisätty");
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
          setOpenTallenna(false);
          const siirtymaTimer = setTimeout(() => {
            router.push(`/yllapito/projekti/${projekti.oid}/henkilot`);
          }, 1500);
          return () => clearTimeout(siirtymaTimer);
        })()
      ),
    [withLoadingSpinner, onSubmit, showSuccessMessage, router, projekti.oid]
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

  const avaaJatkopaatos2 = useCallback(
    (data: KasittelynTilaFormValues) =>
      withLoadingSpinner(
        (async () => {
          try {
            data.kasittelynTila!.toinenJatkopaatos!.aktiivinen = true;
            await onSubmit(data);
            showSuccessMessage("Jatkopäätös lisätty");
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
          setOpenTallenna2(false);
          const siirtymaTimer = setTimeout(() => {
            router.push(`/yllapito/projekti/${projekti.oid}/henkilot`);
          }, 1500);
          return () => clearTimeout(siirtymaTimer);
        })()
      ),
    [withLoadingSpinner, onSubmit, showSuccessMessage, router, projekti.oid]
  );

  const handleClickOpenTallenna2 = () => {
    setOpenTallenna2(true);
  };
  const handleClickCloseTallenna2 = () => {
    setOpenTallenna2(false);
  };

  const handleClickTallennaJaAvaa2 = useMemo(() => {
    return handleSubmit(avaaJatkopaatos2);
  }, [avaaJatkopaatos2, handleSubmit]);

  const jatkopaatos1Pvm = watch("kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm");
  const jatkopaatos1Asiatunnus = watch("kasittelynTila.ensimmainenJatkopaatos.asianumero");
  const jatkopaatos2Pvm = watch("kasittelynTila.toinenJatkopaatos.paatoksenPvm");
  const jatkopaatos2Asiatunnus = watch("kasittelynTila.toinenJatkopaatos.asianumero");
  const jatkopaatos1lisaaDisabled = ensimmainenJatkopaatosDisabled || !jatkopaatos1Pvm || !jatkopaatos1Asiatunnus;
  const jatkopaatos2lisaaDisabled = toinenJatkopaatosDisabled || !jatkopaatos2Pvm || !jatkopaatos2Asiatunnus;
  const velhoURL = getVelhoUrl(projekti.oid);

  return (
    <FormProvider {...useFormReturn}>
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
                onChange={() => trigger("kasittelynTila.ennakkotarkastus")}
              />
            </HassuGrid>
          </SectionContent>
        </Section>
        <Section>
          <SectionContent>
            <h5 className="vayla-subtitle">Hyväksymispäätös</h5>
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
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja && isStatusGreaterOrEqualTo(projekti.status, Status.EPAAKTIIVINEN_1)}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm)}
              />
              {projekti.nykyinenKayttaja.onYllapitaja && isStatusGreaterOrEqualTo(projekti.status, Status.EPAAKTIIVINEN_1) ? (
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
                includeInForm={projekti.nykyinenKayttaja.onYllapitaja && isStatusGreaterOrEqualTo(projekti.status, Status.EPAAKTIIVINEN_2)}
                controllerProps={{ control, name: "kasittelynTila.toinenJatkopaatos.paatoksenPvm" }}
                value={parseValidDateOtherwiseReturnNull(projekti.kasittelynTila?.toinenJatkopaatos?.paatoksenPvm)}
              />
              {projekti.nykyinenKayttaja.onYllapitaja && isStatusGreaterOrEqualTo(projekti.status, Status.EPAAKTIIVINEN_2) ? (
                <TextInput
                  label={`Asiatunnus ${projekti.kasittelynTila?.toinenJatkopaatos?.aktiivinen ? "*" : ""}`}
                  {...register("kasittelynTila.toinenJatkopaatos.asianumero")}
                  disabled={toinenJatkopaatosDisabled}
                  error={(errors as any).kasittelynTila?.toinenJatkopaatos?.asianumero}
                />
              ) : (
                <TextInput label="Asiatunnus" value={projekti.kasittelynTila?.toinenJatkopaatos?.asianumero || ""} disabled />
              )}
              {!projekti.kasittelynTila?.toinenJatkopaatos?.aktiivinen && (
                <HassuGridItem sx={{ alignSelf: "end" }}>
                  <Button id="lisaa_jatkopaatos2" onClick={handleSubmit(handleClickOpenTallenna2)} disabled={jatkopaatos2lisaaDisabled}>
                    Lisää jatkopäätös
                  </Button>
                </HassuGridItem>
              )}
              <LuoJatkopaatosDialog isOpen={openTallenna2} onClose={handleClickCloseTallenna2} tallenna={handleClickTallennaJaAvaa2} />
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
    </FormProvider>
  );
}

const DatePickerConditionallyInTheForm: VFC<HassuDatePickerWithControllerProps<KasittelynTilaFormValues> & { includeInForm: boolean }> = ({
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
