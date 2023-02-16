import React, { FunctionComponent, ReactElement, useCallback, useMemo, useState } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { useRouter } from "next/router";
import ProjektiPerustiedot from "@components/projekti/ProjektiPerustiedot";
import KayttoOikeusHallinta from "@components/projekti/KayttoOikeusHallinta";
import { ProjektiKayttajaInput, TallennaProjektiInput } from "@services/api";
import * as Yup from "yup";
import { FormProvider, useForm, UseFormProps, UseFormReturn } from "react-hook-form";
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
import useApi from "src/hooks/useApi";

// Extend TallennaProjektiInput by making fields other than muistiinpano nonnullable and required
type RequiredFields = Pick<TallennaProjektiInput, "oid" | "kayttoOikeudet" | "versio">;
type FormValues = Required<{
  [K in keyof RequiredFields]: NonNullable<RequiredFields[K]>;
}>;

const validationSchema: Yup.SchemaOf<FormValues> = Yup.object().shape({
  oid: Yup.string().required(),
  versio: Yup.number().required(),
  kayttoOikeudet: kayttoOikeudetSchema,
});

const loadedProjektiValidationSchema = getProjektiValidationSchema([
  ProjektiTestType.PROJEKTI_IS_LOADED,
  ProjektiTestType.PROJEKTI_HAS_ASIATUNNUS,
  ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
  ProjektiTestType.PROJEKTI_NOT_CREATED,
]);

export default function PerustaProjekti(): ReactElement {
  const { data: projekti, error: projektiLoadError, mutate: mutateProjekti } = useProjekti();

  return (
    <section>
      <h1>Projektin Perustaminen</h1>
      <h2>{projekti?.velho.nimi || "-"}</h2>
      {projekti && <PerustaProjektiForm projekti={projekti} projektiLoadError={projektiLoadError} reloadProjekti={mutateProjekti} />}
    </section>
  );
}

interface PerustaProjektiFormProps {
  projekti: ProjektiLisatiedolla;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
  projektiLoadError: any;
}

const defaultFormValues: (projekti: ProjektiLisatiedolla) => FormValues = (projekti: ProjektiLisatiedolla) => ({
  oid: projekti.oid,
  versio: projekti.versio,
  kayttoOikeudet:
    projekti.kayttoOikeudet?.map(({ kayttajatunnus, puhelinnumero, tyyppi, yleinenYhteystieto, elyOrganisaatio }) => {
      const formValues: ProjektiKayttajaInput = {
        kayttajatunnus,
        puhelinnumero: puhelinnumero || "",
        tyyppi,
        yleinenYhteystieto: !!yleinenYhteystieto,
        elyOrganisaatio: elyOrganisaatio || null,
      };
      return formValues;
    }) || [],
});

const PerustaProjektiForm: FunctionComponent<PerustaProjektiFormProps> = ({ projekti, projektiLoadError, reloadProjekti }) => {
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

  const { api } = useApi();

  const submitAndMoveToNewRoute = async (formData: FormValues, newRoute: string) => {
    deleteFieldArrayIds(formData?.kayttoOikeudet);
    setFormIsSubmitting(true);
    try {
      await api.tallennaProjekti(formData);
      await reloadProjekti();
      reset(formData);
      router.push(newRoute);
    } catch (e) {
      log.log("OnSubmit Error", e);
    }
    setFormIsSubmitting(false);
  };

  const submitCreateAnotherOne = async (formData: FormValues) => {
    submitAndMoveToNewRoute(formData, "/yllapito/perusta");
  };

  const submitMoveToProject = async (formData: FormValues) => {
    submitAndMoveToNewRoute(formData, `/yllapito/projekti/${projekti.oid}`);
  };

  const onKayttajatUpdate = useCallback(
    (kayttajat: ProjektiKayttajaInput[]) => {
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
            <KayttoOikeusHallinta
              disableFields={disableFormEdit}
              projektiKayttajat={projekti.kayttoOikeudet || []}
              onKayttajatUpdate={onKayttajatUpdate}
            />
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
