import { PageProps } from "@pages/_app";
import React, { ReactElement, useCallback, useState, useEffect } from "react";
import { api, TallennaProjektiInput } from "@services/api";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import { useForm, UseFormProps } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import TextInput from "@components/form/TextInput";
import DatePicker from "@components/form/DatePicker";
import HassuGrid from "@components/HassuGrid";
import HassuSpinner from "@components/HassuSpinner";
import { useProjekti } from "src/hooks/useProjekti";
import HassuStack from "@components/layout/HassuStack";
import Button from "@components/button/Button";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import { removeTypeName } from "src/util/removeTypeName";
import { yupResolver } from "@hookform/resolvers/yup";
import { kasittelynTilaSchema } from "src/schemas/kasittelynTila";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";

type FormValues = Pick<TallennaProjektiInput, "oid" | "kasittelynTila">;

export default function Kasittelyntila({ setRouteLabels }: PageProps): ReactElement {
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const isLoadingProjekti = !projekti && !projektiLoadError;
  const disableFormEdit =
    !projekti?.nykyinenKayttaja.onYllapitaja || projektiLoadError || isLoadingProjekti || isFormSubmitting;
  useProjektiBreadcrumbs(setRouteLabels);
  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(kasittelynTilaSchema, { abortEarly: false, recursive: true }),
    defaultValues: { kasittelynTila: null },
    mode: "onChange",
    reValidateMode: "onChange",
  };

  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const onSubmit = useCallback(
    async (data: FormValues) => {
      setIsFormSubmitting(true);
      try {
        await api.tallennaProjekti(data);
        await reloadProjekti();
        showSuccessMessage("Tallennus onnistui!");
      } catch (e) {
        log.log("OnSubmit Error", e);
        showErrorMessage("Tallennuksessa tapahtui virhe!");
      }
      setIsFormSubmitting(false);
    },
    [reloadProjekti, showErrorMessage, showSuccessMessage]
  );

  useEffect(() => {
    if (projekti && projekti.oid) {
      const data: FormValues = {
        oid: projekti.oid,
        kasittelynTila: {
          hyvaksymispaatos: removeTypeName(projekti.kasittelynTila?.hyvaksymispaatos),
          ensimmainenJatkopaatos: removeTypeName(projekti.kasittelynTila?.ensimmainenJatkopaatos),
          toinenJatkopaatos: removeTypeName(projekti.kasittelynTila?.toinenJatkopaatos),
        },
      };

      reset(data);
    }
  }, [projekti, reset]);

  //TODO: lukutila, nyt valiaikaisesti ei-admineille disabled kentat ja painikkeet
  return (
    <ProjektiPageLayout title="Käsittelyn tila">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Section>
          <p>
            Pääkäyttäjä lisää sivulle tietoa suunnitelman hallinnollisellisen käsittelyn tiloista, jotka ovat nähtävissä
            lukutilassa muille järjestelmän käyttäjille. Tiedot siirtyvät Käsittelyn tila -sivulta Projektivelhoon.
          </p>
          <SectionContent>
            <h5 className="vayla-small-title">Hyväksymispäätös</h5>
            <p>
              Anna päivämäärä, jolloin suunnitelma on saanut hyväksymispäätöksen sekä päätöksen asianumeron. Päätöksen
              päivä ja asianumero siirtyvät suunnitelman hyväksymispäätöksen kuulutukselle.
            </p>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePicker
                label="Päätöksen päivä"
                className="md:max-w-min"
                {...register("kasittelynTila.hyvaksymispaatos.paatoksenPvm")}
                error={(errors as any).kasittelynTila?.hyvaksymispaatos?.paatoksenPvm}
                disabled={disableFormEdit}
              />
              <TextInput
                label="Asianumero"
                {...register("kasittelynTila.hyvaksymispaatos.asianumero")}
                disabled={disableFormEdit}
                error={(errors as any).kasittelynTila?.hyvaksymispaatos?.asianumero}
              ></TextInput>
            </HassuGrid>
          </SectionContent>
          <SectionContent>
            <h5 className="vayla-small-title">Jatkopäätös</h5>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePicker
                label="1. jatkopäätös annettu"
                className="md:max-w-min"
                {...register("kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm")}
                error={(errors as any).kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm}
                disabled
              />
              <TextInput
                label="Asianumero"
                {...register("kasittelynTila.ensimmainenJatkopaatos.asianumero")}
                error={(errors as any).kasittelynTila?.ensimmainenJatkopaatos?.asianumero}
                disabled
              ></TextInput>
            </HassuGrid>
            <HassuGrid cols={{ lg: 3 }}>
              <DatePicker
                label="2. jatkopäätös annettu"
                className="md:max-w-min"
                {...register("kasittelynTila.toinenJatkopaatos.paatoksenPvm")}
                error={(errors as any).kasittelynTila?.toinenJatkopaatos?.paatoksenPvm}
                disabled
              />
              <TextInput
                label="Asianumero"
                {...register("kasittelynTila.toinenJatkopaatos.asianumero")}
                error={(errors as any).kasittelynTila?.toinenJatkopaatos?.asianumero}
                disabled
              ></TextInput>
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
    </ProjektiPageLayout>
  );
}
