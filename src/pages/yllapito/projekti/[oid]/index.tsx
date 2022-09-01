import { useRouter } from "next/router";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import log from "loglevel";
import { PageProps } from "@pages/_app";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { api, Status, TallennaProjektiInput } from "@services/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, FormProvider, useForm, UseFormProps } from "react-hook-form";
import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import ProjektiPerustiedot from "@components/projekti/ProjektiPerustiedot";
import ExtLink from "@components/ExtLink";
import RadioButton from "@components/form/RadioButton";
import ProjektiKuntatiedot from "@components/projekti/ProjektiKuntatiedot";
import ProjektiLiittyvatSuunnitelmat from "@components/projekti/ProjektiLiittyvatSuunnitelmat";
import ProjektiSuunnittelusopimusTiedot from "@components/projekti/ProjektiSunnittelusopimusTiedot";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import FormGroup from "@components/form/FormGroup";
import axios from "axios";
import { maxNoteLength, perustiedotValidationSchema, UIValuesSchema } from "src/schemas/perustiedot";
import useSnackbars from "src/hooks/useSnackbars";
import ProjektiKuulutuskielet from "@components/projekti/ProjektiKuulutuskielet";
import Section from "@components/layout/Section";
import HassuStack from "@components/layout/HassuStack";
import HassuSpinner from "@components/HassuSpinner";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import { Stack } from "@mui/material";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";

type TransientFormValues = {
  suunnittelusopimusprojekti: "true" | "false" | null;
  liittyviasuunnitelmia: "true" | "false" | null;
};
type PersitentFormValues = Pick<
  TallennaProjektiInput,
  "oid" | "muistiinpano" | "euRahoitus" | "suunnitteluSopimus" | "liittyvatSuunnitelmat" | "kielitiedot"
>;
export type FormValues = TransientFormValues & PersitentFormValues;

const loadedProjektiValidationSchema = getProjektiValidationSchema([
  ProjektiTestType.PROJEKTI_IS_LOADED,
  ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
  ProjektiTestType.PROJEKTI_IS_CREATED,
]);

export default function ProjektiSivu({ setRouteLabels }: PageProps) {
  useProjektiBreadcrumbs(setRouteLabels);
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti({ revalidateOnMount: true });

  return (
    <ProjektiPageLayout title={"Projektin tiedot"} showUpdateButton>
      {projekti && <ProjektiSivuLomake {...{ projekti, projektiLoadError, reloadProjekti }} />}
    </ProjektiPageLayout>
  );
}

interface ProjektiSivuLomakeProps {
  projekti: ProjektiLisatiedolla;
  projektiLoadError: any;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
}

function ProjektiSivuLomake({ projekti, projektiLoadError, reloadProjekti }: ProjektiSivuLomakeProps) {
  const velhoURL = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + projekti.oid;

  const router = useRouter();

  const [statusBeforeSave, setStatusBeforeSave] = useState<Status | null | undefined>();
  const isLoadingProjekti = !projekti && !projektiLoadError;

  const [formIsSubmitting, setFormIsSubmitting] = useState(false);

  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit =
    !projekti?.nykyinenKayttaja.omaaMuokkausOikeuden || projektiHasErrors || isLoadingProjekti || formIsSubmitting;

  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const defaultValues: FormValues = useMemo(() => {
    const tallentamisTiedot: FormValues = {
      oid: projekti.oid,
      muistiinpano: projekti.muistiinpano || "",
      euRahoitus: projekti.euRahoitus,
      liittyvatSuunnitelmat:
        projekti?.liittyvatSuunnitelmat?.map((suunnitelma) => {
          const { __typename, ...suunnitelmaInput } = suunnitelma;
          return suunnitelmaInput;
        }) || [],
      suunnittelusopimusprojekti:
        projekti.status === Status.EI_JULKAISTU ? null : projekti.suunnitteluSopimus ? "true" : "false",
      liittyviasuunnitelmia:
        projekti.status === Status.EI_JULKAISTU ? null : projekti.liittyvatSuunnitelmat?.length ? "true" : "false",
    };
    if (projekti.kielitiedot) {
      const { __typename, ...kielitiedotInput } = projekti.kielitiedot;
      tallentamisTiedot.kielitiedot = kielitiedotInput;
    }
    if (projekti.suunnitteluSopimus) {
      const { __typename, ...suunnitteluSopimusInput } = projekti.suunnitteluSopimus;
      tallentamisTiedot.suunnitteluSopimus = suunnitteluSopimusInput;
    }
    console.log(tallentamisTiedot);
    return tallentamisTiedot;
  }, [projekti]);

  const formOptions: UseFormProps<FormValues> = useMemo(() => {
    return {
      resolver: yupResolver(perustiedotValidationSchema.concat(UIValuesSchema), { abortEarly: false, recursive: true }),
      defaultValues,
      mode: "onChange",
      reValidateMode: "onChange",
      context: projekti,
    };
  }, [defaultValues, projekti]);

  const useFormReturn = useForm<FormValues>(formOptions);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const talletaLogo = useCallback(async (logoTiedosto: File) => {
    const contentType = (logoTiedosto as Blob).type || "application/octet-stream";
    const response = await api.valmisteleTiedostonLataus(logoTiedosto.name, contentType);
    await axios.put(response.latausLinkki, logoTiedosto, {
      headers: {
        "Content-Type": contentType,
      },
    });
    return response.tiedostoPolku;
  }, []);

  const onSubmit = useCallback(
    async (data: FormValues) => {
      const { suunnittelusopimusprojekti, liittyviasuunnitelmia, ...persistentData } = data;
      deleteFieldArrayIds(persistentData.liittyvatSuunnitelmat);
      reset(data);
      setFormIsSubmitting(true);
      try {
        const logoTiedosto = persistentData.suunnitteluSopimus?.logo as unknown as File | undefined | string;
        if (persistentData.suunnitteluSopimus && logoTiedosto instanceof File) {
          persistentData.suunnitteluSopimus.logo = await talletaLogo(logoTiedosto);
        } else if (persistentData.suunnitteluSopimus) {
          // If logo has already been saved and no file has been given,
          // remove the logo property from formData so it won't get overwrited
          delete persistentData.suunnitteluSopimus.logo;
        }
        setStatusBeforeSave(projekti?.status);

        await api.tallennaProjekti(persistentData);
        await reloadProjekti();
        showSuccessMessage("Tallennus onnistui!");
      } catch (e) {
        log.log("OnSubmit Error", e);
        showErrorMessage("Tallennuksessa tapahtui virhe!");
      }
      setFormIsSubmitting(false);
    },
    [reset, projekti?.status, reloadProjekti, showSuccessMessage, talletaLogo, showErrorMessage]
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
            <Section>
              {!isLoadingProjekti && (
                <ProjektiErrorNotification projekti={projekti} validationSchema={loadedProjektiValidationSchema} />
              )}
              <ProjektiPerustiedot projekti={projekti} />
              <Stack direction="column">
                {projekti?.velho?.linkki && <ExtLink href={projekti?.velho?.linkki}>Hankesivu</ExtLink>}
                <ExtLink href={velhoURL}>Projektin sivu Projektivelhossa</ExtLink>
              </Stack>
            </Section>
            <ProjektiKuntatiedot projekti={projekti} />
            <ProjektiKuulutuskielet />
            <ProjektiLiittyvatSuunnitelmat projekti={projekti} />
            <ProjektiSuunnittelusopimusTiedot projekti={projekti} />
            <Section smallGaps>
              <h4 className="vayla-small-title">EU-rahoitus</h4>
              <Controller
                control={control}
                name="euRahoitus"
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <FormGroup
                    label="Rahoittaako EU suunnitteluhanketta? *"
                    errorMessage={errors?.euRahoitus?.message}
                    flexDirection="row"
                  >
                    <RadioButton
                      label="Kyllä"
                      onBlur={onBlur}
                      onChange={() => onChange(true)}
                      checked={value === true}
                      ref={ref}
                    />
                    <RadioButton
                      label="Ei"
                      onBlur={onBlur}
                      onChange={() => onChange(false)}
                      checked={value === false}
                      ref={ref}
                    />
                  </FormGroup>
                )}
              />
            </Section>
            <Section smallGaps>
              <h4 className="vayla-small-title">Muistiinpanot</h4>
              <p>
                Voit kirjoittaa alla olevaan kenttään sisäisiä muistiinpanoja, jotka näkyvät kaikille projektiin
                lisätyille henkilöille. Muistiinpanoa voi muokata ainoastaan henkilöt, joilla on projektiin
                muokkausoikeudet. Vain viimeisimpänä tallennettu muistiinpano jää näkyviin.
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
