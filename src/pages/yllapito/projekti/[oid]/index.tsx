import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import log from "loglevel";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import { Kieli, LokalisoituTekstiInputEiPakollinen, Status, TallennaProjektiInput } from "@services/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import ProjektiSuunnittelusopimusTiedot from "@components/projekti/ProjektiSunnittelusopimusTiedot";
import ProjektiEuRahoitusTiedot from "@components/projekti/ProjektiEuRahoitusTiedot";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import { maxNoteLength, perustiedotValidationSchema, UIValuesSchema } from "src/schemas/perustiedot";
import useSnackbars from "src/hooks/useSnackbars";
import ProjektiKuulutuskielet from "@components/projekti/ProjektiKuulutuskielet";
import Section from "@components/layout/Section2";
import HassuStack from "@components/layout/HassuStack";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import ProjektinTiedotLukutila from "@components/projekti/lukutila/ProjektinTiedotLukutila";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import useApi from "src/hooks/useApi";
import { lataaTiedosto } from "../../../../util/fileUtil";
import ProjektinPerusosio from "@components/projekti/perusosio/Perusosio";
import ContentSpacer from "@components/layout/ContentSpacer";
import { isKuulutusPublic } from "src/util/isKuulutusJulkaistu";
import Notification, { NotificationType } from "@components/notification/Notification";
import VahainenMenettelyOsio from "@components/projekti/projektintiedot/VahainenMenettelyOsio";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import AsianhallintaIntegraatioYhteys from "@components/projekti/projektintiedot/AsianhallintaIntegraatioYhteys";
import useCurrentUser from "src/hooks/useCurrentUser";
import LinkitetytProjektit from "@components/projekti/LinkitetytProjektit";
import ProjektiTiedotPageLayout from "@components/projekti/ProjektiTiedotPageLayout";

type TransientFormValues = {
  suunnittelusopimusprojekti: "true" | "false" | null;
};
type PersitentFormValues = Pick<
  TallennaProjektiInput,
  | "oid"
  | "versio"
  | "muistiinpano"
  | "euRahoitus"
  | "euRahoitusLogot"
  | "suunnitteluSopimus"
  | "kielitiedot"
  | "vahainenMenettely"
  | "asianhallinta"
>;
export type FormValues = TransientFormValues & PersitentFormValues;

const loadedProjektiValidationSchema = getProjektiValidationSchema([
  ProjektiTestType.PROJEKTI_IS_LOADED,
  ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
  ProjektiTestType.PROJEKTI_HAS_ASIATUNNUS,
  ProjektiTestType.PROJEKTI_IS_CREATED,
]);

export default function ProjektiSivu() {
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti({ revalidateOnMount: true });

  if (!projekti) {
    return <></>;
  }

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);
  return (
    <ProjektiTiedotPageLayout>
      {projekti &&
        (epaaktiivinen ? (
          <ProjektinTiedotLukutila projekti={projekti} />
        ) : (
          <ProjektiSivuLomake {...{ projekti, projektiLoadError, reloadProjekti }} />
        ))}
    </ProjektiTiedotPageLayout>
  );
}

interface ProjektiSivuLomakeProps {
  projekti: ProjektiLisatiedolla;
  projektiLoadError: any;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
}

function ProjektiSivuLomake({ projekti, projektiLoadError, reloadProjekti }: ProjektiSivuLomakeProps) {
  const { data: nykyinenKayttaja } = useCurrentUser();
  const router = useRouter();

  const [statusBeforeSave, setStatusBeforeSave] = useState<Status | null | undefined>();
  const isLoadingProjekti = !projekti && !projektiLoadError;

  const { isLoading: formIsSubmitting, withLoadingSpinner } = useLoadingSpinner();

  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit = !projekti?.nykyinenKayttaja.omaaMuokkausOikeuden || projektiHasErrors || isLoadingProjekti || formIsSubmitting;

  const { showSuccessMessage } = useSnackbars();

  const defaultValues: FormValues = useMemo(() => {
    const tallentamisTiedot: FormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      muistiinpano: projekti.muistiinpano ?? "",
      euRahoitus: !!projekti.euRahoitus,
      vahainenMenettely: !!projekti.vahainenMenettely,
      suunnittelusopimusprojekti:
        projekti.status === Status.EI_JULKAISTU_PROJEKTIN_HENKILOT ? null : projekti.suunnitteluSopimus ? "true" : "false",
    };
    if (projekti.kielitiedot) {
      const { __typename, ...kielitiedotInput } = projekti.kielitiedot;
      tallentamisTiedot.kielitiedot = kielitiedotInput;
    }
    if (projekti.suunnitteluSopimus) {
      const { __typename, logo, ...suunnitteluSopimusInput } = projekti.suunnitteluSopimus;
      const { __typename: _t, ...logoInput } = logo || {};
      tallentamisTiedot.suunnitteluSopimus = { ...suunnitteluSopimusInput, logo: logoInput };
    }
    if (projekti.euRahoitusLogot) {
      const { __typename, ...euRahoitusLogotInput } = projekti.euRahoitusLogot;
      tallentamisTiedot.euRahoitusLogot = euRahoitusLogotInput;
    }
    if (projekti.asianhallinta?.aktivoitavissa) {
      tallentamisTiedot.asianhallinta = { inaktiivinen: !!projekti.asianhallinta.inaktiivinen };
    }
    return tallentamisTiedot;
  }, [projekti]);

  const isRuotsinkielinenProjekti = useRef(
    [projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)
  );

  const hasEuRahoitus = useRef(!!projekti.euRahoitus);

  const formOptions: UseFormProps<FormValues, ProjektiValidationContext> = useMemo(() => {
    return {
      resolver: yupResolver(perustiedotValidationSchema.concat(UIValuesSchema), { abortEarly: false, recursive: true }),
      defaultValues,
      mode: "onChange",
      reValidateMode: "onChange",
      context: { projekti, isRuotsinkielinenProjekti, hasEuRahoitus },
    };
  }, [defaultValues, projekti]);

  const useFormReturn = useForm<FormValues, ProjektiValidationContext>(formOptions);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useFormReturn;

  const kielitiedot = watch("kielitiedot");

  useEffect(() => {
    isRuotsinkielinenProjekti.current = [kielitiedot?.ensisijainenKieli, kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI);
  }, [kielitiedot?.ensisijainenKieli, kielitiedot?.toissijainenKieli]);

  const euRahoitus = watch("euRahoitus");

  useEffect(() => {
    hasEuRahoitus.current = !!euRahoitus;
  }, [euRahoitus]);

  // Lomakkeen resetointi Velhosynkronointia varten
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useLeaveConfirm(isDirty);

  const api = useApi();

  const talletaLogo = useCallback(async (tiedosto: File) => await lataaTiedosto(api, tiedosto), [api]);

  const onSubmit = useCallback(
    (data: FormValues) =>
      withLoadingSpinner(
        (async () => {
          const { suunnittelusopimusprojekti, ...persistentData } = data;
          const kieli2 = persistentData.kielitiedot?.toissijainenKieli;
          if (persistentData.kielitiedot && !kieli2) {
            persistentData.kielitiedot.toissijainenKieli = null;
          }
          try {
            if (suunnittelusopimusprojekti === "true" && persistentData.suunnitteluSopimus?.logo) {
              const ssLogo: LokalisoituTekstiInputEiPakollinen = {};
              const originalInputLogo = persistentData.suunnitteluSopimus.logo;
              const logoTiedostoFi = originalInputLogo?.SUOMI as unknown as File | undefined | string;
              if (logoTiedostoFi instanceof File) {
                ssLogo.SUOMI = await talletaLogo(logoTiedostoFi);
              }
              const logoTiedostoSv = originalInputLogo?.RUOTSI as unknown as File | undefined | string;
              if (logoTiedostoSv instanceof File) {
                ssLogo.RUOTSI = await talletaLogo(logoTiedostoSv);
              }
              persistentData.suunnitteluSopimus.logo = ssLogo;
            }

            if (persistentData.euRahoitus) {
              const euLogo: LokalisoituTekstiInputEiPakollinen = {};
              const originalInputLogo = persistentData.euRahoitusLogot;
              const euLogoFITiedosto = originalInputLogo?.SUOMI as unknown as File | undefined | string;
              if (euLogoFITiedosto instanceof File) {
                euLogo.SUOMI = await talletaLogo(euLogoFITiedosto);
              }

              const euLogoSVTiedosto = originalInputLogo?.RUOTSI as unknown as File | undefined | string;
              if (euLogoSVTiedosto instanceof File) {
                euLogo.RUOTSI = await talletaLogo(euLogoSVTiedosto);
              }
              persistentData.euRahoitusLogot = euLogo;
            }

            setStatusBeforeSave(projekti?.status);

            await api.tallennaProjekti(persistentData);
            await reloadProjekti();
            showSuccessMessage("Tallennus onnistui");
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
        })()
      ),
    [withLoadingSpinner, projekti?.status, api, reloadProjekti, showSuccessMessage, talletaLogo]
  );

  useEffect(() => {
    // Detect status change
    if (statusBeforeSave && projekti.status) {
      log.info("previous state:" + statusBeforeSave + ", current state:" + projekti.status);
      if (statusBeforeSave === Status.EI_JULKAISTU && projekti.status === Status.ALOITUSKUULUTUS) {
        const siirtymaTimer = setTimeout(() => {
          router.push(`/yllapito/projekti/${projekti?.oid}/aloituskuulutus`);
        }, 1500);
        return () => clearTimeout(siirtymaTimer);
      }
    }
  }, [projekti, router, statusBeforeSave]);

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <fieldset style={{ display: "contents" }} disabled={disableFormEdit}>
            <input type="hidden" {...register("oid")} />
            <ContentSpacer gap={8} sx={{ marginTop: 8 }}>
              {!isLoadingProjekti && <ProjektiErrorNotification projekti={projekti} validationSchema={loadedProjektiValidationSchema} />}
              {!isKuulutusPublic(projekti.aloitusKuulutusJulkaisu) && (
                <Notification type={NotificationType.INFO_GRAY}>
                  Projektista ei ole julkaistu aloituskuulutusta eikä se siten vielä näy palvelun julkisella puolella.
                </Notification>
              )}
            </ContentSpacer>

            <ProjektinPerusosio projekti={projekti} />
            <VahainenMenettelyOsio formDisabled={disableFormEdit} projekti={projekti} />
            <ProjektiKuulutuskielet projekti={projekti} />
            <LinkitetytProjektit projekti={projekti} />
            <ProjektiSuunnittelusopimusTiedot formDisabled={disableFormEdit} projekti={projekti} />
            <ProjektiEuRahoitusTiedot projekti={projekti} formDisabled={disableFormEdit} />
            {nykyinenKayttaja?.features?.asianhallintaIntegraatio && (
              <AsianhallintaIntegraatioYhteys projekti={projekti} formDisabled={disableFormEdit} />
            )}
            <Section gap={4}>
              <h4 className="vayla-small-title">Muistiinpanot</h4>
              <p>
                Voit kirjoittaa alla olevaan kenttään sisäisiä muistiinpanoja, jotka näkyvät kaikille projektiin lisätyille henkilöille.
                Muistiinpanoa voi muokata ainoastaan henkilöt, joilla on projektiin muokkausoikeudet.
              </p>
              <Textarea
                label="Muistiinpano"
                disabled={disableFormEdit}
                {...register("muistiinpano")}
                error={errors.muistiinpano}
                maxLength={maxNoteLength}
              />
            </Section>
            <Section noDivider>
              <HassuStack alignItems="flex-end">
                <Button id="save" primary={true} disabled={disableFormEdit}>
                  {projekti?.status !== Status.EI_JULKAISTU ? "Tallenna" : "Tallenna ja siirry aloituskuulutukseen"}
                </Button>
              </HassuStack>
            </Section>
          </fieldset>
        </form>
      </FormProvider>
    </>
  );
}
