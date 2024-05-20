import React, { FunctionComponent, ReactElement, useCallback, useMemo, useState } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import { useRouter } from "next/router";
import KayttoOikeusHallinta from "@components/projekti/KayttoOikeusHallinta";
import { ProjektiKayttajaInput, TallennaProjektiInput } from "@services/api";
import * as Yup from "yup";
import { FormProvider, useForm, UseFormProps, UseFormReturn } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import log from "loglevel";
import Button from "@components/button/Button";
import { kayttoOikeudetSchema, KayttoOikeudetSchemaContext } from "src/schemas/kayttoOikeudet";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import Section from "@components/layout/Section2";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import useApi from "src/hooks/useApi";
import ProjektinPerusosio from "@components/projekti/perusosio/Perusosio";
import ContentSpacer from "@components/layout/ContentSpacer";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

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
    <div>
      <h1>Projektin perustaminen</h1>
      <h2>{projekti?.velho?.nimi || "-"}</h2>
      {projekti && <PerustaProjektiForm projekti={projekti} projektiLoadError={projektiLoadError} reloadProjekti={mutateProjekti} />}
    </div>
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

  const defaultValues = useMemo(() => defaultFormValues(projekti), [projekti]);

  const { isLoading: formIsSubmitting, withLoadingSpinner } = useLoadingSpinner();

  const isLoadingProjekti = !projekti && !projektiLoadError;
  const projektiHasError = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit = projektiHasError || isLoadingProjekti || formIsSubmitting;

  const [formContext, setFormContext] = useState<KayttoOikeudetSchemaContext>({ kayttajat: [] });

  const formOptions: UseFormProps<FormValues, ProjektiValidationContext> = {
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

  const api = useApi();

  const submitAndMoveToNewRoute = useCallback(
    (formData: FormValues, newRoute: string) =>
      withLoadingSpinner(
        (async () => {
          deleteFieldArrayIds(formData?.kayttoOikeudet);
          try {
            await api.tallennaProjekti(formData);
            await reloadProjekti();
            reset(formData);
            router.push(newRoute);
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
        })()
      ),
    [api, reloadProjekti, reset, router, withLoadingSpinner]
  );

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
  const [kayttooikeusOhjeetOpen, setKayttooikeusOhjeetOpen] = useState(() => {
    const savedValue = localStorage.getItem("kayttoOikeusOhjeet");
    const isOpen = savedValue ? savedValue.toLowerCase() !== "false" : true;
    return isOpen;
  });
  const kayttooikeusOhjeetOnClose = useCallback(() => {
    setKayttooikeusOhjeetOpen(false);
    localStorage.setItem("kayttoOikeusOhjeet", "false");
  }, []);
  const kayttooikeusOhjeetOnOpen = useCallback(() => {
    setKayttooikeusOhjeetOpen(true);
    localStorage.setItem("kayttoOikeusOhjeet", "true");
  }, []);
  return (
    <FormProvider {...useFormReturn}>
      <form>
        <fieldset style={{ display: "contents" }} disabled={disableFormEdit}>
          {!formIsSubmitting && !isLoadingProjekti && (
            <ContentSpacer gap={8} sx={{ marginTop: 8 }}>
              <ProjektiErrorNotification projekti={projekti} validationSchema={loadedProjektiValidationSchema} />
            </ContentSpacer>
          )}
          <input type="hidden" {...register("oid")} />
          <ProjektinPerusosio projekti={projekti} />
          <KayttoOikeusHallinta
            disableFields={disableFormEdit}
            projektiKayttajat={projekti.kayttoOikeudet || []}
            onKayttajatUpdate={onKayttajatUpdate}
            projekti={projekti}
            includeTitle={true}
            ohjeetOpen={kayttooikeusOhjeetOpen}
            ohjeetOnClose={kayttooikeusOhjeetOnClose}
            ohjeetOnOpen={kayttooikeusOhjeetOnOpen}
          />

          <Section noDivider>
            <div className="flex gap-6 flex-col md:flex-row">
              <Button
                className="mr-auto"
                onClick={(e) => {
                  router.back();
                  e.preventDefault();
                }}
              >
                Takaisin
              </Button>
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
  );
};
