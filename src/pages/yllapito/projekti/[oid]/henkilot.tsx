import { PageProps } from "@pages/_app";
import React, { ReactElement, useCallback, useEffect, useMemo } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import KayttoOikeusHallinta from "@components/projekti/KayttoOikeusHallinta";
import { api, TallennaProjektiInput, ProjektiKayttajaInput } from "@services/api";
import * as Yup from "yup";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import log from "loglevel";
import Button from "@components/button/Button";
import { kayttoOikeudetSchema, KayttoOikeudetSchemaContext } from "src/schemas/kayttoOikeudet";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import { getProjektiValidationSchema, ProjektiTestType } from "../../../../schemas/projekti";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import Section from "@components/layout/Section";
import HassuStack from "@components/layout/HassuStack";
import HassuSpinner from "@components/HassuSpinner";
import useSnackbars from "src/hooks/useSnackbars";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import HenkilotLukutila from "@components/projekti/lukutila/HenkilotLukutila";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";

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
  ProjektiTestType.PROJEKTI_IS_CREATED,
]);

export default function HenkilotPage({ setRouteLabels }: PageProps): ReactElement {
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti({ revalidateOnMount: true });
  useProjektiBreadcrumbs(setRouteLabels);

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  return (
    <ProjektiPageLayout title="Projektin Henkilöt" showUpdateButton={true}>
      {projekti &&
        (epaaktiivinen && projekti.kayttoOikeudet ? (
          <HenkilotLukutila kayttoOikeudet={projekti.kayttoOikeudet} />
        ) : (
          <Henkilot {...{ projekti, projektiLoadError, reloadProjekti }} />
        ))}
    </ProjektiPageLayout>
  );
}

interface HenkilotFormProps {
  projekti: ProjektiLisatiedolla;
  projektiLoadError: any;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
}

function Henkilot({ projekti, projektiLoadError, reloadProjekti }: HenkilotFormProps): ReactElement {
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);
  const [formContext, setFormContext] = useState<KayttoOikeudetSchemaContext>({ kayttajat: [] });

  const isLoadingProjekti = !projekti && !projektiLoadError;
  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit = !projekti?.nykyinenKayttaja.omaaMuokkausOikeuden || projektiHasErrors || isLoadingProjekti || formIsSubmitting;

  const defaultValues: FormValues = useMemo(
    () => ({
      oid: projekti.oid,
      kayttoOikeudet:
        projekti.kayttoOikeudet?.map(({ kayttajatunnus, puhelinnumero, tyyppi, yleinenYhteystieto }) => ({
          kayttajatunnus,
          puhelinnumero: puhelinnumero || "",
          tyyppi,
          yleinenYhteystieto: !!yleinenYhteystieto,
        })) || [],
    }),
    [projekti]
  );

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
    reset,
    register,
  } = useFormReturn;

  // Lomakkeen resetointi Velhosynkronointia varten
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useLeaveConfirm(isDirty);

  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const onSubmit = async (formData: FormValues) => {
    deleteFieldArrayIds(formData?.kayttoOikeudet);
    setFormIsSubmitting(true);
    try {
      await api.tallennaProjekti(formData);
      await reloadProjekti();
      reset(formData);
      showSuccessMessage("Henkilötietojen tallennus onnistui");
    } catch (e) {
      showErrorMessage("Tietojen tallennuksessa tapahtui virhe");
      log.log("OnSubmit Error", e);
    }
    setFormIsSubmitting(false);
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <fieldset style={{ display: "contents" }} disabled={disableFormEdit}>
            {!formIsSubmitting && !isLoadingProjekti && (
              <ProjektiErrorNotification projekti={projekti} validationSchema={loadedProjektiValidationSchema} />
            )}
            <KayttoOikeusHallinta
              disableFields={disableFormEdit}
              projektiKayttajat={projekti.kayttoOikeudet || []}
              onKayttajatUpdate={onKayttajatUpdate}
              suunnitteluSopimusYhteysHenkilo={projekti.suunnitteluSopimus?.yhteysHenkilo}
            />
            <Section noDivider>
              <HassuStack alignItems="flex-end">
                <Button className="ml-auto" primary disabled={disableFormEdit}>
                  Tallenna
                </Button>
              </HassuStack>
            </Section>
            <input type="hidden" {...register("oid")} />
          </fieldset>
        </form>
      </FormProvider>
      <HassuSpinner open={formIsSubmitting || isLoadingProjekti} />
    </>
  );
}
