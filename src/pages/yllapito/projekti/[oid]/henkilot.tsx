import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import KayttoOikeusHallinta from "@components/projekti/KayttoOikeusHallinta";
import * as Yup from "yup";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import log from "loglevel";
import Button from "@components/button/Button";
import { kayttoOikeudetSchema } from "src/schemas/kayttoOikeudet";
import ProjektiPageLayout, { ProjektiPageLayoutContext } from "@components/projekti/ProjektiPageLayout";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import { getProjektiValidationSchema, ProjektiTestType } from "../../../../schemas/projekti";
import Section from "@components/layout/Section";
import HassuStack from "@components/layout/HassuStack";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import HenkilotLukutila from "@components/projekti/lukutila/HenkilotLukutila";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import PaivitaVelhoTiedotButton from "@components/projekti/PaivitaVelhoTiedotButton";
import useApi from "src/hooks/useApi";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { useShowTallennaProjektiMessage } from "src/hooks/useShowTallennaProjektiMessage";
import { Kayttaja, ProjektiKayttaja, TallennaProjektiInput } from "@services/api";
import { organisaatioIsEly, organisaatioIsEvk } from "common/util/organisaatioIsEly";

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

export type PotentiaalisestiPoistunutKayttaja = Kayttaja & { poistunut?: boolean };

export default function HenkilotPage(): ReactElement {
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti({ revalidateOnMount: true });

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

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

  if (!projekti || !initialKayttajat || !kayttoOikeudet) {
    return <></>;
  }

  return (
    <ProjektiPageLayout
      title="Projektin henkilöt"
      showInfo={!epaaktiivinen}
      contentAsideTitle={<PaivitaVelhoTiedotButton projektiOid={projekti.oid} reloadProjekti={reloadProjekti} />}
    >
      {epaaktiivinen && projekti.kayttoOikeudet ? (
        <HenkilotLukutila kayttoOikeudet={projekti.kayttoOikeudet} />
      ) : (
        <Henkilot
          projekti={projekti}
          kayttoOikeudet={kayttoOikeudet}
          initialKayttajat={initialKayttajat}
          projektiLoadError={projektiLoadError}
          reloadProjekti={reloadProjekti}
        />
      )}
    </ProjektiPageLayout>
  );
}

interface HenkilotFormProps {
  projekti: ProjektiLisatiedolla;
  projektiLoadError: any;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
  initialKayttajat: PotentiaalisestiPoistunutKayttaja[];
  kayttoOikeudet: ProjektiKayttaja[];
}

function Henkilot({ projekti, projektiLoadError, reloadProjekti, initialKayttajat, kayttoOikeudet }: HenkilotFormProps): ReactElement {
  const { isLoading: formIsSubmitting, withLoadingSpinner } = useLoadingSpinner();

  const isLoadingProjekti = !projekti && !projektiLoadError;
  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit = !projekti?.nykyinenKayttaja.omaaMuokkausOikeuden || projektiHasErrors || isLoadingProjekti || formIsSubmitting;

  const defaultValues: FormValues = useMemo(
    () => ({
      oid: projekti.oid,
      versio: projekti.versio,
      kayttoOikeudet:
        kayttoOikeudet?.map(
          ({ kayttajatunnus, puhelinnumero, tyyppi, yleinenYhteystieto, elyOrganisaatio, evkOrganisaatio, organisaatio }) => ({
            kayttajatunnus,
            puhelinnumero: puhelinnumero || "",
            tyyppi,
            yleinenYhteystieto: !!yleinenYhteystieto,
            elyOrganisaatio: elyOrganisaatio && organisaatioIsEly(organisaatio) ? elyOrganisaatio : null,
            evkOrganisaatio: evkOrganisaatio && organisaatioIsEvk(organisaatio) ? evkOrganisaatio : null,
            organisaatio: organisaatio || "",
          })
        ) || [],
    }),
    [kayttoOikeudet, projekti.oid, projekti.versio]
  );

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(validationSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  };

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    handleSubmit,
    formState: { isDirty, isSubmitting },
    reset,
    register,
  } = useFormReturn;

  // Lomakkeen resetointi Velhosynkronointia varten
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useLeaveConfirm(!isSubmitting && isDirty);

  const showTallennaProjektiMessage = useShowTallennaProjektiMessage();

  const api = useApi();

  const onSubmit = useCallback(
    (formData: FormValues) =>
      withLoadingSpinner(
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
            const response = await api.tallennaProjekti(tallennaProjektiInput);
            await reloadProjekti();
            showTallennaProjektiMessage(response);
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
        })()
      ),
    [api, reloadProjekti, showTallennaProjektiMessage, withLoadingSpinner]
  );

  const context = useContext(ProjektiPageLayoutContext);
  return (
    <FormProvider {...useFormReturn}>
      <form>
        <fieldset style={{ display: "contents" }} disabled={disableFormEdit}>
          {!formIsSubmitting && !isLoadingProjekti && (
            <ProjektiErrorNotification projekti={projekti} validationSchema={loadedProjektiValidationSchema} />
          )}
          <KayttoOikeusHallinta
            initialKayttajat={initialKayttajat}
            disableFields={disableFormEdit}
            projektiKayttajat={projekti.kayttoOikeudet || []}
            suunnitteluSopimusYhteysHenkilo={projekti.suunnitteluSopimus?.yhteysHenkilo}
            projekti={projekti}
            includeTitle={false}
            ohjeetOpen={context.ohjeetOpen}
            ohjeetOnClose={context.ohjeetOnClose}
            ohjeetOnOpen={context.ohjeetOnOpen}
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
  );
}
