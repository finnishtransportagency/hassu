import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import * as Yup from "yup";
import log from "loglevel";
import { PageProps } from "@pages/_app";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import useProjekti from "src/hooks/useProjekti";
import { api, Projekti, TallennaProjektiInput } from "@services/api";
import { SchemaOf } from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import ButtonLink from "@components/button/ButtonLink";
import Notification from "@components/notification/Notification";
import ProjektiPerustiedot from "@components/projekti/ProjektiPerustiedot";
import ExtLink from "@components/ExtLink";
import Checkbox from "@components/form/CheckBox";
import RadioButton from "@components/form/RadioButton";
import ProjektiKuntatiedot from "@components/projekti/ProjektiKuntatiedot";
import ProjektiLiittyvatSuunnitelmat from "@components/projekti/ProjektiLiittyvatSuunnitelmat";
import ProjektiSuunnittelusopimusTiedot from "@components/projekti/ProjektiSunnittelusopimusTiedot";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import FormGroup from "@components/form/FormGroup";
import axios from "axios";
import { cloneDeep } from "lodash";
import { puhelinNumeroSchema } from "src/schemas/puhelinNumero";

export type FormValues = Pick<
  TallennaProjektiInput,
  "oid" | "muistiinpano" | "lisakuulutuskieli" | "eurahoitus" | "suunnitteluSopimus" | "liittyvatSuunnitelmat"
>;

const maxNoteLength = 2000;

const validationSchema: SchemaOf<FormValues> = Yup.object().shape({
  oid: Yup.string().required(),
  lisakuulutuskieli: Yup.string().notRequired(),
  liittyvatSuunnitelmat: Yup.array()
    .of(
      Yup.object().shape({
        asiatunnus: Yup.string().required(),
        nimi: Yup.string().required(),
      })
    )
    .notRequired(),
  eurahoitus: Yup.string().nullable().required("EU-rahoitustieto on pakollinen"),
  muistiinpano: Yup.string().max(
    maxNoteLength,
    `Muistiinpanoon voidaan kirjoittaa maksimissaan ${maxNoteLength} merkkiä.`
  ),
  suunnitteluSopimus: Yup.object()
    .shape({
      kunta: Yup.string().required("Kunta on pakollinen"),
      etunimi: Yup.string().required("Kunta on pakollinen"),
      sukunimi: Yup.string().required("Kunta on pakollinen"),
      puhelinnumero: puhelinNumeroSchema,
      email: Yup.string().email("Virheellinen sähköpostiosoite").required("Sähköpostiosoite on pakollinen"),
      logo: Yup.mixed().required("Logo on pakollinen."),
    })
    .notRequired()
    .nullable()
    .default(null),
});

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
  const isLoadingProjekti = !projekti && !projektiLoadError;

  const [formIsSubmitting, setFormIsSubmitting] = useState(false);
  const [selectLanguageAvailable, setLanguageChoicesAvailable] = useState(false);

  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit = projektiHasErrors || isLoadingProjekti || formIsSubmitting;
  const [formContext, setFormContext] = useState<Projekti | undefined>(undefined);

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(validationSchema, { abortEarly: false, recursive: true }),
    defaultValues: { muistiinpano: "", lisakuulutuskieli: "", eurahoitus: "", liittyvatSuunnitelmat: [] },
    mode: "onChange",
    reValidateMode: "onChange",
    context: formContext,
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
    const formData = cloneDeep(data);
    deleteFieldArrayIds(formData.liittyvatSuunnitelmat);
    setFormIsSubmitting(true);
    try {
      const logoTiedosto = formData.suunnitteluSopimus?.logo as unknown as File | undefined | string;
      if (formData.suunnitteluSopimus && logoTiedosto instanceof File) {
        formData.suunnitteluSopimus.logo = await talletaLogo(logoTiedosto);
      } else if (formData.suunnitteluSopimus) {
        // If logo has already been saved and no file has been given,
        // remove the logo property from formData so it won't get overwrited
        delete formData.suunnitteluSopimus.logo;
      }
      await api.tallennaProjekti(formData);
      await reloadProjekti();
    } catch (e) {
      log.log("OnSubmit Error", e);
    }
    setFormIsSubmitting(false);
  };

  const hasLanguageSelected =
    projekti?.lisakuulutuskieli?.startsWith("ruotsi") || projekti?.lisakuulutuskieli?.startsWith("saame") || false;

  useEffect(() => {
    if (projekti && projekti.oid) {
      const tallentamisTiedot: FormValues = {
        oid: projekti.oid,
        muistiinpano: projekti.muistiinpano || "",
        lisakuulutuskieli: projekti.lisakuulutuskieli || "",
        eurahoitus: projekti.eurahoitus || "",
        liittyvatSuunnitelmat:
          projekti?.liittyvatSuunnitelmat?.map((suunnitelma) => {
            const { __typename, ...suunnitelmaInput } = suunnitelma;
            return suunnitelmaInput;
          }) || [],
      };
      if (projekti.suunnitteluSopimus) {
        const { __typename, ...suunnitteluSopimusInput } = projekti.suunnitteluSopimus;
        tallentamisTiedot.suunnitteluSopimus = suunnitteluSopimusInput;
      }
      reset(tallentamisTiedot);
      setFormContext(projekti);
      setLanguageChoicesAvailable(hasLanguageSelected);
    }
  }, [projekti, reset, hasLanguageSelected]);

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
    <ProjektiPageLayout title={"Projektin perustiedot"}>
      <FormProvider {...useFormReturn}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <fieldset disabled={disableFormEdit}>
            <input type="hidden" {...register("oid")} />
            <ProjektiErrorNotification
              disableValidation={isLoadingProjekti}
              projekti={projekti}
              validationSchema={loadedProjektiValidationSchema}
            />
            <div className="content">
              <ProjektiPerustiedot projekti={projekti} />
              <br />
              {projekti?.velho?.linkki && <ExtLink href={projekti?.velho?.linkki}>Hankesivu</ExtLink>}
              <ExtLink href={velhobaseurl + projekti?.oid}>Projektin sivu Projektivelhossa</ExtLink>
            </div>
            <hr />
            <div className="content">
              <ProjektiKuntatiedot projekti={projekti} />
            </div>
            <hr />
            <div className="content">
              <h4 className="vayla-small-title">Projektin kuulutusten kielet</h4>
              <Checkbox
                label="Projekti kuulutetaan suomenkielen lisäksi myös muilla kielillä"
                id="kuulutuskieli"
                onChange={() => setLanguageChoicesAvailable(!selectLanguageAvailable)}
                checked={selectLanguageAvailable}
              ></Checkbox>
              <div className="indent">
                <RadioButton
                  label="Suomen lisäksi ruotsi"
                  value="ruotsi"
                  id="ruotsi"
                  disabled={!selectLanguageAvailable}
                  {...register("lisakuulutuskieli")}
                ></RadioButton>
                <RadioButton
                  label="Suomen lisäksi saame"
                  value="saame"
                  id="saame"
                  disabled={!selectLanguageAvailable}
                  {...register("lisakuulutuskieli")}
                ></RadioButton>
              </div>
            </div>
            <hr />
            <div className="content">
              <ProjektiLiittyvatSuunnitelmat projekti={projekti} />
            </div>
            <hr />
            <div className="content">
              <ProjektiSuunnittelusopimusTiedot projekti={projekti} />
            </div>
            <hr />
            <div className="content">
              <h4 className="vayla-small-title">EU-rahoitus</h4>
              <FormGroup
                label="Rahoittaako EU suunnitteluhanketta? *"
                errorMessage={errors?.eurahoitus?.message}
                flexDirection="row"
              >
                <RadioButton label="Kyllä" value="true" {...register("eurahoitus")}></RadioButton>
                <RadioButton label="Ei" value="false" {...register("eurahoitus")}></RadioButton>
              </FormGroup>
            </div>
            <hr />
            <h4 className="vayla-small-title">Muistiinpanot</h4>
            <p>
              Voit kirjoittaa alla olevaan kenttään sisäisiä muistiinpanoja, jotka näkyvät kaikille projektiin
              lisätyille henkilöille. Muistiinpanoa voi muokata ainoastaan henkilöt, joilla on projektiin
              muokkausoikeudet. Vain viimeisimpänä tallennettu muistiinpano jää näkyviin.
            </p>
            <div className="flex flex-col">
              <Textarea
                label="Muistiinpano"
                disabled={disableFormEdit}
                {...register("muistiinpano")}
                error={errors.muistiinpano}
                maxLength={maxNoteLength}
              />
            </div>
            <hr />
            <Notification>Tallennus ei vielä julkaise tietoja.</Notification>
            <div className="flex justify-between flex-wrap gap-4">
              <Button primary={!projekti?.tallennettu} disabled={disableFormEdit}>
                Tallenna projekti
              </Button>
              {projekti?.tallennettu && projekti?.oid && (
                <ButtonLink primary href={`/yllapito/projekti/${projekti?.oid}/aloituskuulutus`}>
                  Siirry Aloituskuulutukseen
                </ButtonLink>
              )}
            </div>
          </fieldset>
        </form>
      </FormProvider>
    </ProjektiPageLayout>
  );
}
