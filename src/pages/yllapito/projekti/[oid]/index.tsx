import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import log from "loglevel";
import { PageProps } from "@pages/_app";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import useProjekti from "src/hooks/useProjekti";
import { api, Projekti, Status, TallennaProjektiInput } from "@services/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
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
  const velhobaseurl = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-";

  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti(oid);
  const [statusBeforeSave, setStatusBeforeSave] = useState<Status | null | undefined>();
  const isLoadingProjekti = !projekti && !projektiLoadError;

  const [formIsSubmitting, setFormIsSubmitting] = useState(false);

  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit =
    !projekti?.nykyinenKayttaja.omaaMuokkausOikeuden || projektiHasErrors || isLoadingProjekti || formIsSubmitting;
  const [formContext, setFormContext] = useState<Projekti | undefined>(undefined);

  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(perustiedotValidationSchema.concat(UIValuesSchema), { abortEarly: false, recursive: true }),
    defaultValues: {
      muistiinpano: "",
      euRahoitus: null,
      liittyvatSuunnitelmat: null,
      kielitiedot: null,
      suunnittelusopimusprojekti: null,
      liittyviasuunnitelmia: null,
    },
    mode: "onChange",
    reValidateMode: "onChange",
    context: { ...formContext },
  };

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useFormReturn;

  const talletaLogo = async (logoTiedosto: File) => {
    const response = await api.valmisteleTiedostonLataus(logoTiedosto.name);
    await axios.put(response.latausLinkki, logoTiedosto, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });
    return response.tiedostoPolku;
  };

  const onSubmit = async (data: FormValues) => {
    const { suunnittelusopimusprojekti, liittyviasuunnitelmia, ...persistentData } = data;
    deleteFieldArrayIds(persistentData.liittyvatSuunnitelmat);
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
  };

  function booleanToString(value: any) {
    if (typeof value === "boolean") {
      return `${value}`;
    }
    return value;
  }

  useEffect(() => {
    if (projekti && projekti.oid) {
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
      reset(tallentamisTiedot);
      setFormContext(projekti);
    }
  }, [projekti, reset, router, statusBeforeSave]);

  useEffect(() => {
    if (router.isReady) {
      let routeLabel = "";
      if (projekti?.velho?.nimi) {
        routeLabel = projekti.velho?.nimi;
      } else if (typeof oid === "string") {
        routeLabel = oid;
      }
      if (routeLabel) {
        setRouteLabels({ "/yllapito/projekti/[oid]": { label: routeLabel } });
      }
    }
  }, [router.isReady, oid, projekti, setRouteLabels]);

  return (
    <ProjektiPageLayout title={"Projektin tiedot"}>
      <FormProvider {...useFormReturn}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <fieldset style={{ display: "contents" }} disabled={disableFormEdit}>
            <input type="hidden" {...register("oid")} />
            <Section>
              <ProjektiErrorNotification
                disableValidation={isLoadingProjekti}
                projekti={projekti}
                validationSchema={loadedProjektiValidationSchema}
              />
              <ProjektiPerustiedot projekti={projekti} />
              <div>
                {projekti?.velho?.linkki && <ExtLink href={projekti?.velho?.linkki}>Hankesivu</ExtLink>}
                <ExtLink href={velhobaseurl + projekti?.oid}>Projektin sivu Projektivelhossa</ExtLink>
              </div>
            </Section>
            <ProjektiKuntatiedot projekti={projekti} />
            <ProjektiKuulutuskielet />
            <ProjektiLiittyvatSuunnitelmat projekti={projekti} />
            <ProjektiSuunnittelusopimusTiedot projekti={projekti} />
            <Section smallGaps>
              <h4 className="vayla-small-title">EU-rahoitus</h4>
              <FormGroup
                label="Rahoittaako EU suunnitteluhanketta? *"
                errorMessage={errors?.euRahoitus?.message}
                flexDirection="row"
              >
                <RadioButton
                  label="Kyllä"
                  value="true"
                  {...register("euRahoitus", { setValueAs: booleanToString })}
                ></RadioButton>
                <RadioButton
                  label="Ei"
                  value="false"
                  {...register("euRahoitus", { setValueAs: booleanToString })}
                ></RadioButton>
              </FormGroup>
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
                <Button primary={true} disabled={disableFormEdit}>
                  {projekti?.status !== Status.EI_JULKAISTU ? "Tallenna" : "Tallenna ja siirry aloituskuulutukseen"}
                </Button>
              </HassuStack>
            </Section>
          </fieldset>
        </form>
      </FormProvider>
    </ProjektiPageLayout>
  );
}
