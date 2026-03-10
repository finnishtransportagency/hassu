import React, { FunctionComponent, ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import { useRouter } from "next/router";
import KayttoOikeusHallinta, { FormValues } from "@components/projekti/KayttoOikeusHallinta";
import * as Yup from "yup";
import { FormProvider, useForm, UseFormProps, UseFormReturn } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import log from "loglevel";
import Button from "@components/button/Button";
import { kayttoOikeudetSchema } from "src/schemas/kayttoOikeudet";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import Section from "@components/layout/Section2";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import useApi from "src/hooks/useApi";
import ProjektinPerusosio from "@components/projekti/perusosio/Perusosio";
import ContentSpacer from "@components/layout/ContentSpacer";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { Kayttaja, ProjektiKayttaja, TallennaProjektiInput } from "@services/api";

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

export type PotentiaalisestiPoistunutKayttaja = Kayttaja & { poistunut?: boolean };

export default function PerustaProjekti(): ReactElement {
  const { data: projekti, error: projektiLoadError, mutate: mutateProjekti } = useProjekti({ revalidateOnMount: true });

  const [initialKayttajat, setInitialKayttajat] = useState<PotentiaalisestiPoistunutKayttaja[]>();
  const [kayttoOikeudet, setKayttoOikeudet] = useState<ProjektiKayttaja[]>();
  const api = useApi();

  useEffect(() => {
    async function loadKayttajat(kayttajat: string[]): Promise<PotentiaalisestiPoistunutKayttaja[]> {
      if (kayttajat.length === 0) {
        return [];
      }
      return await api.listUsers({
        kayttajatunnus: kayttajat,
      });
    }
    const getInitialKayttajat = async () => {
      const kayttoOikeudet = projekti?.kayttoOikeudet;
      if (!kayttoOikeudet) {
        return;
      }
      const kayttajat = await loadKayttajat(kayttoOikeudet.map((kayttaja) => kayttaja.kayttajatunnus));
      const poistuneetKayttajat = kayttoOikeudet
        .filter((pk) => !kayttajat.some((k) => k.uid === pk.kayttajatunnus))
        .map<PotentiaalisestiPoistunutKayttaja>(({ etunimi, sukunimi, email, kayttajatunnus, puhelinnumero, organisaatio }) => ({
          __typename: "Kayttaja",
          etunimi,
          sukunimi,
          email,
          organisaatio,
          puhelinnumero,
          uid: kayttajatunnus,
          poistunut: true,
        }));
      const kaikkiKayttajat = kayttajat.concat(poistuneetKayttajat);
      setInitialKayttajat(kaikkiKayttajat);
      setKayttoOikeudet(
        kayttoOikeudet.map((kayttoOikeus) => {
          const kayttaja = kaikkiKayttajat.find((kayttaja) => kayttaja.uid === kayttoOikeus.kayttajatunnus);
          const etunimi = kayttaja?.etunimi ?? kayttoOikeus.etunimi;
          const sukunimi = kayttaja?.sukunimi ?? kayttoOikeus.sukunimi;
          const email = kayttaja?.email ?? kayttoOikeus.email;
          const organisaatio = kayttaja?.organisaatio ?? kayttoOikeus.organisaatio;
          return { ...kayttoOikeus, etunimi, sukunimi, email, organisaatio };
        })
      );
    };
    getInitialKayttajat();
  }, [api, projekti?.kayttoOikeudet]);

  return (
    <div>
      <h1>Projektin perustaminen</h1>
      <h2>{projekti?.velho?.nimi || "-"}</h2>
      {projekti && initialKayttajat && kayttoOikeudet && (
        <PerustaProjektiForm
          projekti={projekti}
          initialKayttajat={initialKayttajat}
          kayttoOikeudet={kayttoOikeudet}
          projektiLoadError={projektiLoadError}
          reloadProjekti={mutateProjekti}
        />
      )}
    </div>
  );
}

interface PerustaProjektiFormProps {
  projekti: ProjektiLisatiedolla;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
  projektiLoadError: any;
  initialKayttajat: PotentiaalisestiPoistunutKayttaja[];
  kayttoOikeudet: ProjektiKayttaja[];
}

const defaultFormValues: (kayttoOikeudet: ProjektiKayttaja[], oid: string, versio: number) => FormValues = (
  kayttoOikeudet: ProjektiKayttaja[],
  oid: string,
  versio: number
) => ({
  oid: oid,
  versio: versio,
  kayttoOikeudet:
    kayttoOikeudet?.map(
      ({ kayttajatunnus, puhelinnumero, tyyppi, yleinenYhteystieto, elyOrganisaatio, evkOrganisaatio, organisaatio }) => ({
        kayttajatunnus,
        puhelinnumero: puhelinnumero || "",
        tyyppi,
        yleinenYhteystieto: !!yleinenYhteystieto,
        elyOrganisaatio: elyOrganisaatio || null,
        evkOrganisaatio: evkOrganisaatio || null,
        organisaatio: organisaatio || "",
      })
    ) || [],
});

const PerustaProjektiForm: FunctionComponent<PerustaProjektiFormProps> = ({
  projekti,
  initialKayttajat,
  kayttoOikeudet,
  projektiLoadError,
  reloadProjekti,
}) => {
  const router = useRouter();

  const defaultValues = useMemo(
    () => defaultFormValues(kayttoOikeudet, projekti.oid, projekti.versio),
    [kayttoOikeudet, projekti.oid, projekti.versio]
  );

  const { isLoading: formIsSubmitting, withLoadingSpinner } = useLoadingSpinner();

  const isLoadingProjekti = !projekti && !projektiLoadError;
  const projektiHasError = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit = projektiHasError || isLoadingProjekti || formIsSubmitting;

  const formOptions: UseFormProps<FormValues, ProjektiValidationContext> = {
    resolver: yupResolver(validationSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  };

  const useFormReturn = useForm<FormValues>(formOptions);

  const {
    handleSubmit,
    formState: { isDirty, isSubmitting },
    register,
    reset,
  } = useFormReturn as UseFormReturn<FormValues>;

  useLeaveConfirm(!isSubmitting && isDirty);

  const api = useApi();

  const submitAndMoveToNewRoute = useCallback(
    async (formData: FormValues, newRoute: string) =>
      await withLoadingSpinner(
        (async () => {
          const tallennaProjektiInput: TallennaProjektiInput = {
            oid: formData.oid,
            versio: formData.versio,
            kayttoOikeudet: formData.kayttoOikeudet.map(
              ({ kayttajatunnus, puhelinnumero, elyOrganisaatio, evkOrganisaatio, tyyppi, yleinenYhteystieto }) => ({
                kayttajatunnus,
                puhelinnumero,
                elyOrganisaatio,
                evkOrganisaatio,
                tyyppi,
                yleinenYhteystieto,
              })
            ),
          };
          try {
            await api.tallennaProjekti(tallennaProjektiInput);
            await reloadProjekti();
            reset(formData);
            await router.push(newRoute);
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
        })()
      ),
    [api, reloadProjekti, reset, router, withLoadingSpinner]
  );

  const submitCreateAnotherOne = async (formData: FormValues) => {
    await submitAndMoveToNewRoute(formData, "/yllapito/perusta");
  };

  const submitMoveToProject = async (formData: FormValues) => {
    await submitAndMoveToNewRoute(formData, `/yllapito/projekti/${projekti.oid}`);
  };

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
            projektiKayttajat={kayttoOikeudet}
            projekti={projekti}
            includeTitle={true}
            ohjeetOpen={kayttooikeusOhjeetOpen}
            ohjeetOnClose={kayttooikeusOhjeetOnClose}
            ohjeetOnOpen={kayttooikeusOhjeetOnOpen}
            initialKayttajat={initialKayttajat}
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
