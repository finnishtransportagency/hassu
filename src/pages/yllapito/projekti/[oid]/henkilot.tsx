import { PageProps } from "@pages/_app";
import React, { ReactElement, useEffect, useCallback } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import KayttoOikeusHallinta, { defaultKayttaja } from "@components/projekti/KayttoOikeusHallinta";
import { api, TallennaProjektiInput, Kayttaja } from "@services/api";
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

export default function Henkilot({ setRouteLabels }: PageProps): ReactElement {
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);
  const [formContext, setFormContext] = useState<KayttoOikeudetSchemaContext>({ kayttajat: [] });

  const { data: projekti, error: projektiLoadError, mutate: mutateProjekti } = useProjekti();
  const isLoadingProjekti = !projekti && !projektiLoadError;
  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit =
    !projekti?.nykyinenKayttaja.omaaMuokkausOikeuden || projektiHasErrors || isLoadingProjekti || formIsSubmitting;

  useProjektiBreadcrumbs(setRouteLabels);

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(validationSchema, { abortEarly: false, recursive: true }),
    defaultValues: { kayttoOikeudet: [defaultKayttaja] },
    mode: "onChange",
    reValidateMode: "onChange",
    context: formContext,
  };

  const useFormReturn = useForm<FormValues>(formOptions);
  const { reset, handleSubmit } = useFormReturn;
  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const onSubmit = async (formData: FormValues) => {
    deleteFieldArrayIds(formData?.kayttoOikeudet);
    setFormIsSubmitting(true);
    try {
      await api.tallennaProjekti(formData);
      mutateProjekti();
      showSuccessMessage("Henkilötietojen tallennus onnistui");
    } catch (e) {
      showErrorMessage("Tietojen tallennuksessa tapahtui virhe");
      log.log("OnSubmit Error", e);
    }
    setFormIsSubmitting(false);
  };

  useEffect(() => {
    if (projekti && projekti.oid) {
      const tallentamisTiedot: FormValues = {
        oid: projekti.oid,
        kayttoOikeudet:
          projekti.kayttoOikeudet?.map(({ kayttajatunnus, puhelinnumero, rooli, esitetaanKuulutuksessa }) => ({
            kayttajatunnus,
            puhelinnumero: puhelinnumero || "",
            rooli,
            esitetaanKuulutuksessa,
          })) || [],
      };
      reset(tallentamisTiedot);
    }
  }, [projekti, reset]);

  const onKayttajatUpdate = useCallback(
    (kayttajat: Kayttaja[]) => {
      setFormContext({ kayttajat });
    },
    [setFormContext]
  );

  return (
    <ProjektiPageLayout title="Projektin Henkilöt">
      <FormProvider {...useFormReturn}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <fieldset style={{ display: "contents" }} disabled={disableFormEdit}>
            <ProjektiErrorNotification
              projekti={projekti}
              disableValidation={isLoadingProjekti}
              validationSchema={loadedProjektiValidationSchema}
            />
            <KayttoOikeusHallinta disableFields={disableFormEdit} onKayttajatUpdate={onKayttajatUpdate} />
            <Section noDivider>
              <HassuStack alignItems="flex-end">
                <Button className="ml-auto" primary disabled={disableFormEdit}>
                  Tallenna
                </Button>
              </HassuStack>
            </Section>
          </fieldset>
        </form>
      </FormProvider>
      <HassuSpinner open={formIsSubmitting || isLoadingProjekti} />
    </ProjektiPageLayout>
  );
}
