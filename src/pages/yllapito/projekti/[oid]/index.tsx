import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import log from "loglevel";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { Kieli, Status, TallennaProjektiInput } from "@services/api";
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
import HassuSpinner from "@components/HassuSpinner";
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
    <ProjektiPageLayout
      title={"Projektin tiedot"}
      contentAsideTitle={!epaaktiivinen && <PaivitaVelhoTiedotButton projektiOid={projekti.oid} reloadProjekti={reloadProjekti} />}
    >
      {projekti &&
        (epaaktiivinen ? (
          <ProjektinTiedotLukutila projekti={projekti} />
        ) : (
          <ProjektiSivuLomake {...{ projekti, projektiLoadError, reloadProjekti }} />
        ))}
    </ProjektiPageLayout>
  );
}

interface ProjektiSivuLomakeProps {
  projekti: ProjektiLisatiedolla;
  projektiLoadError: any;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
}

function ProjektiSivuLomake({ projekti, projektiLoadError, reloadProjekti }: ProjektiSivuLomakeProps) {
  const router = useRouter();

  const [statusBeforeSave, setStatusBeforeSave] = useState<Status | null | undefined>();
  const isLoadingProjekti = !projekti && !projektiLoadError;

  const [formIsSubmitting, setFormIsSubmitting] = useState(false);

  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit = !projekti?.nykyinenKayttaja.omaaMuokkausOikeuden || projektiHasErrors || isLoadingProjekti || formIsSubmitting;

  const { showSuccessMessage } = useSnackbars();

  const defaultValues: FormValues = useMemo(() => {
    const tallentamisTiedot: FormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      muistiinpano: projekti.muistiinpano || "",
      euRahoitus: !!projekti.euRahoitus,
      vahainenMenettely: !!projekti.vahainenMenettely,
      liittyvatSuunnitelmat:
        projekti?.liittyvatSuunnitelmat?.map((suunnitelma) => {
          const { __typename, ...suunnitelmaInput } = suunnitelma;
          return suunnitelmaInput;
        }) || [],
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
    return tallentamisTiedot;
  }, [projekti]);

  const isRuotsinkielinenProjekti = useRef(
    [projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)
  );

  const hasEuRahoitus = useRef(!!projekti.euRahoitus);

  const formOptions: UseFormProps<FormValues> = useMemo(() => {
    return {
      resolver: yupResolver(perustiedotValidationSchema.concat(UIValuesSchema), { abortEarly: false, recursive: true }),
      defaultValues,
      mode: "onChange",
      reValidateMode: "onChange",
      context: { projekti, isRuotsinkielinenProjekti, hasEuRahoitus },
    };
  }, [defaultValues, projekti]);

  const useFormReturn = useForm<FormValues>(formOptions);

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
    async (data: FormValues) => {
      const { liittyviasuunnitelmia, suunnittelusopimusprojekti, ...persistentData } = data;
      deleteFieldArrayIds(persistentData.liittyvatSuunnitelmat);
      setFormIsSubmitting(true);
      const kieli2 = persistentData.kielitiedot?.toissijainenKieli;
      if (persistentData.kielitiedot && !kieli2) {
        persistentData.kielitiedot.toissijainenKieli = null;
      }
      try {
        if (suunnittelusopimusprojekti === "true") {
          const logoTiedostoFi = persistentData.suunnitteluSopimus?.logo?.SUOMI as unknown as File | undefined | string;
          if (persistentData.suunnitteluSopimus?.logo?.SUOMI && logoTiedostoFi instanceof File) {
            persistentData.suunnitteluSopimus.logo.SUOMI = await talletaLogo(logoTiedostoFi);
          } else if (persistentData.suunnitteluSopimus?.logo?.SUOMI) {
            // If logo has already been saved and no file has been given,
            // remove the logo property from formData so it won't get overwrited
            delete persistentData.suunnitteluSopimus?.logo.SUOMI;
          }
          const logoTiedostoSv = persistentData.suunnitteluSopimus?.logo?.RUOTSI as unknown as File | undefined | string;
          if (!isRuotsinkielinenProjekti.current && persistentData.suunnitteluSopimus?.logo) {
            persistentData.suunnitteluSopimus.logo.RUOTSI = null;
          } else if (persistentData.suunnitteluSopimus?.logo?.RUOTSI && logoTiedostoSv instanceof File) {
            persistentData.suunnitteluSopimus.logo.RUOTSI = await talletaLogo(logoTiedostoSv);
          } else if (persistentData.suunnitteluSopimus?.logo?.RUOTSI) {
            // If logo has already been saved and no file has been given,
            // remove the logo property from formData so it won't get overwrited
            delete persistentData.suunnitteluSopimus?.logo.RUOTSI;
          }
        } else {
          persistentData.suunnitteluSopimus = null;
        }

        if (persistentData.euRahoitus) {
          const euLogoFITiedosto = persistentData?.euRahoitusLogot?.SUOMI as unknown as File | undefined | string;
          if (persistentData.euRahoitusLogot?.SUOMI && euLogoFITiedosto instanceof File) {
            persistentData.euRahoitusLogot.SUOMI = await talletaLogo(euLogoFITiedosto);
          } else if (persistentData.euRahoitusLogot?.SUOMI) {
            // If logo has already been saved and no file has been given,
            // remove the logo property from formData so it won't get overwrited
            delete persistentData.euRahoitusLogot.SUOMI;
          }

          const euLogoSVTiedosto = persistentData?.euRahoitusLogot?.RUOTSI as unknown as File | undefined | string;
          if (!isRuotsinkielinenProjekti.current && persistentData.euRahoitusLogot) {
            persistentData.euRahoitusLogot.RUOTSI = null;
          } else if (persistentData.euRahoitusLogot?.RUOTSI && euLogoSVTiedosto instanceof File) {
            persistentData.euRahoitusLogot.RUOTSI = await talletaLogo(euLogoSVTiedosto);
          } else if (persistentData.euRahoitusLogot?.RUOTSI) {
            // If logo has already been saved and no file has been given,
            // remove the logo property from formData so it won't get overwrited
            delete persistentData.euRahoitusLogot.RUOTSI;
          }
        } else {
          persistentData.euRahoitusLogot = null;
        }

        setStatusBeforeSave(projekti?.status);

        await api.tallennaProjekti(persistentData);
        await reloadProjekti();
        showSuccessMessage("Tallennus onnistui");
      } catch (e) {
        log.log("OnSubmit Error", e);
      }
      setFormIsSubmitting(false);
    },
    [projekti?.status, api, reloadProjekti, showSuccessMessage, talletaLogo]
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
              <Notification type={NotificationType.INFO} hideIcon>
                <h4 className="vayla-small-title">Ohjeet</h4>
                <ul className="list-disc block pl-5">
                  <li>
                    Osa projektin perustiedoista on tuotu Projektivelhosta. Jos näissä tiedoissa on virhe, tee muutos Projektivelhoon.
                  </li>
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
                </ul>
              </Notification>
            </ContentSpacer>

            <ProjektinPerusosio projekti={projekti} />
            <VahainenMenettelyOsio formDisabled={disableFormEdit} projekti={projekti} />
            <ProjektiKuulutuskielet projekti={projekti} />
            <ProjektiLiittyvatSuunnitelmat projekti={projekti} />
            <ProjektiSuunnittelusopimusTiedot formDisabled={disableFormEdit} projekti={projekti} />
            <ProjektiEuRahoitusTiedot projekti={projekti} formDisabled={disableFormEdit} />
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
      <HassuSpinner open={formIsSubmitting || isLoadingProjekti} />
    </>
  );
}
