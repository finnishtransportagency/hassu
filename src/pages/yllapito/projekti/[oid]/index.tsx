import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import log from "loglevel";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import { Kieli, LokalisoituTekstiInputEiPakollinen, Status, TallennaProjektiInput } from "@services/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import ProjektiLiittyvatSuunnitelmat from "@components/projekti/ProjektiLiittyvatSuunnitelmat";
import ProjektiSuunnittelusopimusTiedot from "@components/projekti/ProjektiSunnittelusopimusTiedot";
import ProjektiEuRahoitusTiedot from "@components/projekti/ProjektiEuRahoitusTiedot";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import { maxNoteLength, perustiedotValidationSchema, UIValuesSchema } from "src/schemas/perustiedot";
import useSnackbars from "src/hooks/useSnackbars";
import ProjektiKuulutuskielet from "@components/projekti/ProjektiKuulutuskielet";
import Section from "@components/layout/Section2";
import HassuStack from "@components/layout/HassuStack";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import ProjektinTiedotLukutila from "@components/projekti/lukutila/ProjektinTiedotLukutila";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import PaivitaVelhoTiedotButton from "@components/projekti/PaivitaVelhoTiedotButton";
import useApi from "src/hooks/useApi";
import { lataaTiedosto } from "../../../../util/fileUtil";
import ProjektinPerusosio from "@components/projekti/perusosio/Perusosio";
import ContentSpacer from "@components/layout/ContentSpacer";
import { isKuulutusPublic } from "src/util/isKuulutusJulkaistu";
import Notification, { NotificationType } from "@components/notification/Notification";
import VahainenMenettelyOsio from "@components/projekti/projektintiedot/VahainenMenettelyOsio";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import AsianhallintaIntegraatioYhteys from "@components/projekti/projektintiedot/AsianhallintaIntegraatioYhteys";
import { OhjelistaNotification } from "@components/projekti/common/OhjelistaNotification";
import useCurrentUser from "src/hooks/useCurrentUser";

type TransientFormValues = {
  suunnittelusopimusprojekti: "true" | "false" | null;
  liittyviasuunnitelmia: "true" | "false" | null;
};
type PersitentFormValues = Pick<
  TallennaProjektiInput,
  | "oid"
  | "versio"
  | "muistiinpano"
  | "euRahoitus"
  | "euRahoitusLogot"
  | "suunnitteluSopimus"
  | "liittyvatSuunnitelmat"
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

  const [ohjeetOpen, ohjeetSetOpen] = useState(false);
  const ohjeetOnClose = useCallback(() => {
    ohjeetSetOpen(false);
    localStorage.setItem("perustietojenOhjeet", "false");
  }, []);
  const ohjeetOnOpen = useCallback(() => {
    ohjeetSetOpen(true);
    localStorage.setItem("perustietojenOhjeet", "true");
  }, []);

  // useeffectissa vasta ohjeetOpen "alustus" koska muuten ongelmia nextjs ssr takia tms, eli ReferenceError: localStorage is not defined
  useEffect(() => {
    const savedValue = localStorage.getItem("perustietojenOhjeet");
    ohjeetSetOpen(savedValue ? savedValue.toLowerCase() !== "false" : true);
  }, []);

  if (!projekti) {
    return <></>;
  }

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);
  return (
    <ProjektiPageLayout
      title={"Projektin tiedot"}
      showInfo={!epaaktiivinen && !ohjeetOpen}
      onOpenInfo={ohjeetOnOpen}
      contentAsideTitle={!epaaktiivinen && <PaivitaVelhoTiedotButton projektiOid={projekti.oid} reloadProjekti={reloadProjekti} />}
    >
      {projekti &&
        (epaaktiivinen ? (
          <ProjektinTiedotLukutila projekti={projekti} />
        ) : (
          <ProjektiSivuLomake ohjeetOpen={ohjeetOpen} ohjeetOnClose={ohjeetOnClose} {...{ projekti, projektiLoadError, reloadProjekti }} />
        ))}
    </ProjektiPageLayout>
  );
}

interface ProjektiSivuLomakeProps {
  projekti: ProjektiLisatiedolla;
  projektiLoadError: any;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
  ohjeetOpen: boolean;
  ohjeetOnClose: () => void;
}

function ProjektiSivuLomake({ projekti, projektiLoadError, reloadProjekti, ohjeetOpen, ohjeetOnClose }: ProjektiSivuLomakeProps) {
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
      liittyvatSuunnitelmat:
        projekti?.liittyvatSuunnitelmat?.map((suunnitelma) => {
          const { __typename, ...suunnitelmaInput } = suunnitelma;
          return suunnitelmaInput;
        }) ?? [],
      suunnittelusopimusprojekti:
        projekti.status === Status.EI_JULKAISTU_PROJEKTIN_HENKILOT ? null : projekti.suunnitteluSopimus ? "true" : "false",
      liittyviasuunnitelmia:
        projekti.status === Status.EI_JULKAISTU_PROJEKTIN_HENKILOT ? null : projekti.liittyvatSuunnitelmat?.length ? "true" : "false",
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

  const some = watch();

  console.log({ errors, some });

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
          const { liittyviasuunnitelmia, suunnittelusopimusprojekti, ...persistentData } = data;
          deleteFieldArrayIds(persistentData.liittyvatSuunnitelmat);
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
              <OhjelistaNotification open={ohjeetOpen} onClose={ohjeetOnClose}>
                <li>Osa projektin perustiedoista on tuotu Projektivelhosta. Jos näissä tiedoissa on virhe, tee muutos Projektivelhoon.</li>
                <li>Puuttuvat tiedot pitää olla täytettynä ennen aloituskuulutuksen tekemistä.</li>
                <li>
                  Jos tallennettuihin perustietoihin tehdään muutoksia, ne eivät vaikuta jo tehtyihin kuulutuksiin tai projektin aiempiin
                  vaiheisiin.
                </li>
                <li>
                  Huomaathan, että Projektin kuulutusten kielet-, Suunnittelusopimus- ja EU-rahoitus -valintaan voi vaikuttaa
                  aloituskuulutuksen hyväksymiseen saakka, jonka jälkeen valinta lukittuu. Suunnittelusopimuksellisissa suunnitelmissa
                  kunnan edustajaa on mahdollista vaihtaa prosessin aikana.
                </li>
              </OhjelistaNotification>
            </ContentSpacer>

            <ProjektinPerusosio projekti={projekti} />
            <VahainenMenettelyOsio formDisabled={disableFormEdit} projekti={projekti} />
            <ProjektiKuulutuskielet projekti={projekti} />
            <ProjektiLiittyvatSuunnitelmat projekti={projekti} />
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
