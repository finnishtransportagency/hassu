import { PageProps } from "@pages/_app";
import React, { ReactElement, useCallback, useState, useMemo } from "react";
import { api, HyvaksymispaatosInput, TallennaProjektiInput } from "@services/api";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import { useForm, UseFormProps } from "react-hook-form";
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
import { TextField } from "@mui/material";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import cloneDeep from "lodash/cloneDeep";
import assert from "assert";
import KasittelynTilaLukutila from "@components/projekti/lukutila/KasittelynTilaLukutila";
import ExtLink from "@components/ExtLink";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";

type FormValues = Pick<TallennaProjektiInput, "oid" | "kasittelynTila">;

export default function KasittelyntilaSivu({ setRouteLabels }: PageProps): ReactElement {
  useProjektiBreadcrumbs(setRouteLabels);
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti({ revalidateOnMount: true });
  return (
    <ProjektiPageLayout title="Käsittelyn tila">
      {projekti &&
        ((projektiOnEpaaktiivinen(projekti) && !projekti.nykyinenKayttaja.onYllapitaja) || !projekti?.nykyinenKayttaja.onYllapitaja ? (
          <KasittelynTilaLukutila projekti={projekti} />
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

function KasittelyntilaPageContent({ projekti, projektiLoadError, reloadProjekti }: HenkilotFormProps): ReactElement {
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const isLoadingProjekti = !projekti && !projektiLoadError;
  const defaultValues: FormValues = useMemo(() => {
    const hyvaksymispaatos: HyvaksymispaatosInput = {
      paatoksenPvm: projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm || null,
      asianumero: projekti.kasittelynTila?.hyvaksymispaatos?.asianumero || "",
    };

    //TODO When the input fields are enabled, the values should be strings not null or undefined
    const ensimmainenJatkopaatos: HyvaksymispaatosInput = {
      paatoksenPvm: null,
      asianumero: undefined,
    };
    //TODO When the input fields are enabled, the values should be strings not null or undefined
    const toinenJatkopaatos: HyvaksymispaatosInput = {
      paatoksenPvm: null,
      asianumero: undefined,
    };
    const formValues: FormValues = {
      oid: projekti.oid,
      kasittelynTila: {
        hyvaksymispaatos,
        ensimmainenJatkopaatos,
        toinenJatkopaatos,
      },
    };
    return formValues;
  }, [projekti]);

  const disableFormEdit = !projekti?.nykyinenKayttaja.onYllapitaja || !!projektiLoadError || isLoadingProjekti || isFormSubmitting;

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(kasittelynTilaSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  };

  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    control,
    reset,
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const onSubmit = useCallback(
    async (data: FormValues) => {
      setIsFormSubmitting(true);

      function cleanupHyvaksymisPaatos(paatos: HyvaksymispaatosInput | null | undefined): HyvaksymispaatosInput | undefined {
        if (!paatos || (!paatos.paatoksenPvm && !paatos.asianumero)) {
          return undefined;
        }
        return { ...paatos };
      }

      try {
        const cleanedUpData = cloneDeep(data);
        assert(cleanedUpData.kasittelynTila);
        cleanedUpData.kasittelynTila.hyvaksymispaatos = cleanupHyvaksymisPaatos(cleanedUpData.kasittelynTila?.hyvaksymispaatos);
        cleanedUpData.kasittelynTila.ensimmainenJatkopaatos = cleanupHyvaksymisPaatos(cleanedUpData.kasittelynTila?.ensimmainenJatkopaatos);
        cleanedUpData.kasittelynTila.toinenJatkopaatos = cleanupHyvaksymisPaatos(cleanedUpData.kasittelynTila?.toinenJatkopaatos);
        await api.tallennaProjekti(cleanedUpData);
        await reloadProjekti();
        reset(data);
        showSuccessMessage("Tallennus onnistui!");
      } catch (e) {
        log.log("OnSubmit Error", e);
        showErrorMessage("Tallennuksessa tapahtui virhe!");
      }
      setIsFormSubmitting(false);
    },
    [reloadProjekti, reset, showErrorMessage, showSuccessMessage]
  );

  const velhoURL = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + projekti.oid;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Section>
          <p>
            Pääkäyttäjä lisää sivulle tietoa suunnitelman hallinnollisellisen käsittelyn tiloista, jotka ovat nähtävissä lukutilassa muille
            järjestelmän käyttäjille. Tiedot siirtyvät Käsittelyn tila -sivulta <ExtLink href={velhoURL}>Projektivelhosta</ExtLink>.
          </p>
          <SectionContent>
            <h5 className="vayla-small-title">Hyväksymispäätös</h5>
            <p>
              Anna päivämäärä, jolloin suunnitelma on saanut hyväksymispäätöksen sekä päätöksen asianumeron. Päätöksen päivä ja asianumero
              siirtyvät suunnitelman hyväksymispäätöksen kuulutukselle.
            </p>
            <HassuGrid cols={{ lg: 3 }}>
              <HassuDatePickerWithController
                label="Päätöksen päivä"
                disabled={disableFormEdit}
                controllerProps={{ control: control, name: "kasittelynTila.hyvaksymispaatos.paatoksenPvm" }}
                disableFuture
                textFieldProps={{ required: true }}
              />
              <TextField
                label="Asianumero"
                {...register("kasittelynTila.hyvaksymispaatos.asianumero")}
                disabled={disableFormEdit}
                error={(errors as any).kasittelynTila?.hyvaksymispaatos?.asianumero}
              />
            </HassuGrid>
          </SectionContent>
          <SectionContent>
            <h5 className="vayla-small-title">Jatkopäätös</h5>
            <HassuGrid cols={{ lg: 3 }}>
              <HassuDatePickerWithController
                label="1. jatkopäätös annettu"
                disabled
                controllerProps={{ control: control, name: "kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm" }}
              />
              <TextField
                label="Asianumero"
                {...register("kasittelynTila.ensimmainenJatkopaatos.asianumero")}
                error={(errors as any).kasittelynTila?.ensimmainenJatkopaatos?.asianumero}
                disabled
              ></TextField>
            </HassuGrid>
            <HassuGrid cols={{ lg: 3 }}>
              <HassuDatePickerWithController
                label="2. jatkopäätös annettu"
                disabled
                controllerProps={{ control: control, name: "kasittelynTila.toinenJatkopaatos.paatoksenPvm" }}
              />
              <TextField
                label="Asianumero"
                {...register("kasittelynTila.toinenJatkopaatos.asianumero")}
                error={(errors as any).kasittelynTila?.toinenJatkopaatos?.asianumero}
                disabled
              ></TextField>
            </HassuGrid>
          </SectionContent>
        </Section>
        <Section noDivider>
          <HassuStack alignItems="flex-end">
            <Button id="save" primary={true} disabled={disableFormEdit}>
              Tallenna
            </Button>
          </HassuStack>
        </Section>
      </form>
      <HassuSpinner open={isFormSubmitting || isLoadingProjekti} />
    </>
  );
}
