import React, { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import KayttoOikeusHallinta from "@components/projekti/KayttoOikeusHallinta";
import { ProjektiKayttajaInput, TallennaProjektiInput } from "@services/api";
import * as Yup from "yup";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
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
import useSnackbars from "src/hooks/useSnackbars";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import HenkilotLukutila from "@components/projekti/lukutila/HenkilotLukutila";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import PaivitaVelhoTiedotButton from "@components/projekti/PaivitaVelhoTiedotButton";
import useApi from "src/hooks/useApi";
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
  ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
  ProjektiTestType.PROJEKTI_HAS_ASIATUNNUS,
  ProjektiTestType.PROJEKTI_IS_CREATED,
]);

export default function HenkilotPage(): ReactElement {
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti({ revalidateOnMount: true });

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);
  const [ohjeetOpen, ohjeetSetOpen] = useState(() => {
    let isOpen = false;
    if (typeof window !== "undefined") {
      const savedValue = localStorage.getItem("kayttoOikeusOhjeet");
      isOpen = savedValue ? savedValue.toLowerCase() !== "false" : true;
    }
    return isOpen;
  });
  const ohjeetOnClose = useCallback(() => {
    ohjeetSetOpen(false);
    localStorage.setItem("kayttoOikeusOhjeet", "false");
  }, []);
  const ohjeetOnOpen = useCallback(() => {
    ohjeetSetOpen(true);
    localStorage.setItem("kayttoOikeusOhjeet", "true");
  }, []);

  if (!projekti) {
    return <></>;
  }

  return (
    <ProjektiPageLayout
      title="Projektin henkilöt"
      showInfo={!epaaktiivinen && !ohjeetOpen}
      onOpenInfo={ohjeetOnOpen}
      contentAsideTitle={<PaivitaVelhoTiedotButton projektiOid={projekti.oid} reloadProjekti={reloadProjekti} />}
    >
      {projekti &&
        (epaaktiivinen && projekti.kayttoOikeudet ? (
          <HenkilotLukutila kayttoOikeudet={projekti.kayttoOikeudet} />
        ) : (
          <Henkilot ohjeetOpen={ohjeetOpen} ohjeetOnClose={ohjeetOnClose} {...{ projekti, projektiLoadError, reloadProjekti }} />
        ))}
    </ProjektiPageLayout>
  );
}

interface HenkilotFormProps {
  projekti: ProjektiLisatiedolla;
  projektiLoadError: any;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
  ohjeetOpen: boolean;
  ohjeetOnClose: () => void;
}

function Henkilot({ projekti, projektiLoadError, reloadProjekti, ohjeetOpen, ohjeetOnClose }: HenkilotFormProps): ReactElement {
  const { isLoading: formIsSubmitting, withLoadingSpinner } = useLoadingSpinner();
  const [formContext, setFormContext] = useState<KayttoOikeudetSchemaContext>({ kayttajat: [] });

  const isLoadingProjekti = !projekti && !projektiLoadError;
  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit = !projekti?.nykyinenKayttaja.omaaMuokkausOikeuden || projektiHasErrors || isLoadingProjekti || formIsSubmitting;

  const defaultValues: FormValues = useMemo(
    () => ({
      oid: projekti.oid,
      versio: projekti.versio,
      kayttoOikeudet:
        projekti.kayttoOikeudet?.map(({ kayttajatunnus, puhelinnumero, tyyppi, yleinenYhteystieto, elyOrganisaatio }) => ({
          kayttajatunnus,
          puhelinnumero: puhelinnumero || "",
          tyyppi,
          yleinenYhteystieto: !!yleinenYhteystieto,
          elyOrganisaatio: elyOrganisaatio || null,
        })) || [],
    }),
    [projekti]
  );

  const formOptions: UseFormProps<FormValues, ProjektiValidationContext> = {
    resolver: yupResolver(validationSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    context: formContext,
  };

  const useFormReturn = useForm<FormValues, ProjektiValidationContext>(formOptions);
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

  const { showSuccessMessage } = useSnackbars();

  const api = useApi();

  const onSubmit = useCallback(
    (formData: FormValues) =>
      withLoadingSpinner(
        (async () => {
          deleteFieldArrayIds(formData?.kayttoOikeudet);
          try {
            await api.tallennaProjekti(formData);
            await reloadProjekti();
            showSuccessMessage("Henkilötietojen tallennus onnistui");
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
        })()
      ),
    [api, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

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
            {!formIsSubmitting && !isLoadingProjekti && (
              <ProjektiErrorNotification projekti={projekti} validationSchema={loadedProjektiValidationSchema} />
            )}
            <KayttoOikeusHallinta
              disableFields={disableFormEdit}
              projektiKayttajat={projekti.kayttoOikeudet || []}
              onKayttajatUpdate={onKayttajatUpdate}
              suunnitteluSopimusYhteysHenkilo={projekti.suunnitteluSopimus?.yhteysHenkilo}
              projekti={projekti}
              includeTitle={false}
              ohjeetOpen={ohjeetOpen}
              ohjeetOnClose={ohjeetOnClose}
            />
            <Section noDivider>
              <HassuStack alignItems="flex-end">
                <Button
                  onClick={handleSubmit(onSubmit)}
                  id="save_projekti"
                  className="ml-auto"
                  type="button"
                  primary
                  disabled={disableFormEdit}
                >
                  Tallenna
                </Button>
              </HassuStack>
            </Section>
            <input type="hidden" {...register("oid")} />
          </fieldset>
        </form>
      </FormProvider>
    </>
  );
}
