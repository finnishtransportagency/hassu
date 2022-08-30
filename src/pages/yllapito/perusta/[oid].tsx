import { PageProps } from "@pages/_app";
import React, { ReactElement, useCallback, FC, useMemo } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { useRouter } from "next/router";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import ProjektiPerustiedot from "@components/projekti/ProjektiPerustiedot";
import KayttoOikeusHallinta from "@components/projekti/KayttoOikeusHallinta";
import { api, TallennaProjektiInput, Kayttaja } from "@services/api";
import * as Yup from "yup";
import { useState } from "react";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import log from "loglevel";
import Button from "@components/button/Button";
import ButtonLink from "@components/button/ButtonLink";
import { kayttoOikeudetSchema, KayttoOikeudetSchemaContext } from "src/schemas/kayttoOikeudet";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import Section from "@components/layout/Section";
import HassuSpinner from "@components/HassuSpinner";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";

// Extend TallennaProjektiInput by making fields other than muistiinpano nonnullable and required
type RequiredFields = Pick<TallennaProjektiInput, "oid" | "kayttoOikeudet">;
type FormValues = Required<{
  [K in keyof RequiredFields]: NonNullable<RequiredFields[K]>;
}>;

const validationSchema: Yup.SchemaOf<FormValues> = Yup.object().shape({
  oid: Yup.string().required(),
  kayttoOikeudet: kayttoOikeudetSchema,
});

const loadedProjektiValidationSchema = getProjektiValidationSchema([
  ProjektiTestType.PROJEKTI_IS_LOADED,
  ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
  ProjektiTestType.PROJEKTI_NOT_CREATED,
]);

export default function PerustaProjekti({ setRouteLabels }: PageProps): ReactElement {
  useProjektiBreadcrumbs(setRouteLabels);

  const { data: projekti, error: projektiLoadError, mutate: mutateProjekti } = useProjekti();

  return (
    <section>
      <h1>Projektin Perustaminen</h1>
      <h2>{projekti?.velho.nimi || "-"}</h2>
      {projekti && (
        <PerustaProjektiForm
          projekti={projekti}
          projektiLoadError={projektiLoadError}
          reloadProjekti={mutateProjekti}
        />
      )}
    </section>
  );
}

interface PerustaProjektiFormProps {
  projekti: ProjektiLisatiedolla;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
  projektiLoadError: any;
}

const defaultFormValues = (projekti: ProjektiLisatiedolla) =>
  ({
    oid: projekti.oid,
    kayttoOikeudet:
      projekti.kayttoOikeudet?.map(({ kayttajatunnus, puhelinnumero, rooli, esitetaanKuulutuksessa }) => ({
        kayttajatunnus,
        puhelinnumero: puhelinnumero || "",
        rooli,
        esitetaanKuulutuksessa,
      })) || [],
  } as FormValues);

const PerustaProjektiForm: FC<PerustaProjektiFormProps> = ({ projekti, projektiLoadError, reloadProjekti }) => {
  const router = useRouter();
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);

  const defaultValues = useMemo(() => defaultFormValues(projekti), [projekti]);

  const isLoadingProjekti = !projekti && !projektiLoadError;
  const projektiHasError = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit = projektiHasError || isLoadingProjekti || formIsSubmitting;

  const [formContext, setFormContext] = useState<KayttoOikeudetSchemaContext>({ kayttajat: [] });

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(validationSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    context: formContext,
  };

  const useFormReturn = useForm<FormValues>(formOptions);

  const {
    handleSubmit,
    formState: { isDirty },
    register,
    reset,
  } = useFormReturn as UseFormReturn<FormValues>;

  useLeaveConfirm(isDirty && !formIsSubmitting);

  const submitCreateAnotherOne = async (formData: FormValues) => {
    deleteFieldArrayIds(formData?.kayttoOikeudet);
    reset(formData);
    setFormIsSubmitting(true);
    try {
      await api.tallennaProjekti(formData);
      await reloadProjekti();
      router.push(`/yllapito/perusta`);
    } catch (e) {
      log.log("OnSubmit Error", e);
    }
    setFormIsSubmitting(false);
  };

  const submitMoveToProject = async (formData: FormValues) => {
    deleteFieldArrayIds(formData?.kayttoOikeudet);
    reset(formData);
    setFormIsSubmitting(true);
    try {
      await api.tallennaProjekti(formData);
      await reloadProjekti();
      router.push(`/yllapito/projekti/${projekti.oid}`);
    } catch (e) {
      log.log("OnSubmit Error", e);
    }
    setFormIsSubmitting(false);
  };

  const onKayttajatUpdate = useCallback(
    (kayttajat: Kayttaja[]) => {
      setFormContext({ kayttajat });
    },
    [setFormContext]
  );

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form>
          <fieldset style={{ display: "contents" }} disabled={disableFormEdit}>
            <input type="hidden" {...register("oid")} />
            <Section>
              {!formIsSubmitting && !isLoadingProjekti && (
                <ProjektiErrorNotification projekti={projekti} validationSchema={loadedProjektiValidationSchema} />
              )}
              <ProjektiPerustiedot projekti={projekti} />
            </Section>
            <KayttoOikeusHallinta disableFields={disableFormEdit} onKayttajatUpdate={onKayttajatUpdate} />
            <Section noDivider>
              <div className="flex gap-6 flex-col md:flex-row">
                <ButtonLink className="mr-auto" href="/yllapito/perusta">
                  Takaisin
                </ButtonLink>
                <Button
                  id="save_and_open_projekti"
                  type="button"
                  primary
                  onClick={handleSubmit(submitMoveToProject)}
                  disabled={disableFormEdit}
                >
                  Tallenna ja siirry projektiin
                </Button>
                <Button type="button" onClick={handleSubmit(submitCreateAnotherOne)} disabled={disableFormEdit}>
                  Tallenna ja lisää toinen projekti
                </Button>
              </div>
            </Section>
          </fieldset>
        </form>
      </FormProvider>
      <HassuSpinner open={formIsSubmitting || isLoadingProjekti} />
    </>
  );
};
