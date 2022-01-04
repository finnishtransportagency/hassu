import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import * as Yup from "yup";
import log from "loglevel";
import { PageProps } from "@pages/_app";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import useProjekti from "src/hooks/useProjekti";
import { api, TallennaProjektiInput } from "@services/api";
import { SchemaOf } from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, UseFormProps } from "react-hook-form";
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
import ProjektiSuunnitelusopimusTiedot from "@components/projekti/ProjektiSunnittelusopimusTiedot";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";

type FormValues = Pick<TallennaProjektiInput, "oid" | "muistiinpano" | "lisakuulutuskieli" | "eurahoitus">;

const maxNoteLength = 2000;

const validationSchema: SchemaOf<FormValues> = Yup.object().shape({
  oid: Yup.string().required(),
  lisakuulutuskieli: Yup.string().notRequired(),
  eurahoitus: Yup.string().notRequired(),
  muistiinpano: Yup.string().max(
    maxNoteLength,
    `Muistiinpanoon voidaan kirjoittaa maksimissaan ${maxNoteLength} merkkiä.`
  ),
});

const indentedStyle = {
  paddingLeft: "20px",
};

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

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(validationSchema, { abortEarly: false, recursive: true }),
    defaultValues: { muistiinpano: "", lisakuulutuskieli: "", eurahoitus: "" },
    mode: "onChange",
    reValidateMode: "onChange",
  };

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useFormReturn;

  const onSubmit = async (formData: FormValues) => {
    setFormIsSubmitting(true);
    try {
      await api.tallennaProjekti(formData);
      reloadProjekti();
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
      };
      reset(tallentamisTiedot);
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
      <form onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={disableFormEdit}>
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
            <h4 className="vayla-small-title">Projetin kuulutusten kielet</h4>
            <Checkbox
              label="Projekti kuulutetaan suomenkielen lisäksi myös muilla kielillä"
              id="kuulutuskieli"
              onChange={() => setLanguageChoicesAvailable(!selectLanguageAvailable)}
              checked={selectLanguageAvailable}
            ></Checkbox>
            <div style={indentedStyle}>
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
            <ProjektiLiittyvatSuunnitelmat />
          </div>
          <hr />
          <div className="content">
            <ProjektiSuunnitelusopimusTiedot projekti={projekti} kuntalista={["", "Helsinki", "Espoo", "Vantaa"]} />
          </div>
          <hr />
          <div className="content">
          <h4 className="vayla-small-title">EU-rahoitus</h4>
            <p>Rahoittaako EU suunnitteluhanketta</p>
            <div>
                <RadioButton 
                    label="Kyllä" 
                    value="true" 
                    {...register("eurahoitus")}>
                </RadioButton>
                <RadioButton 
                    label="Ei" 
                    value="false" 
                    {...register("eurahoitus")}>
                </RadioButton>
            </div>
          </div>
          <hr />
          <h4 className="vayla-small-title">Muistiinpanot</h4>
          <p>
            Voit!!! kirjoittaa alla olevaan kenttään sisäisiä muistiinpanoja, jotka näkyvät kaikille projektiin lisätyille
            henkilöille. Muistiinpanoa voi muokata ainoastaan henkilöt, joilla on projektiin muokkausoikeudet. Vain
            viimeisimpänä tallennettu muistiinpano jää näkyviin.
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
            <ButtonLink href={"/yllapito/perusta"}>Takaisin suunnitelman hakuun</ButtonLink>
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
    </ProjektiPageLayout>
  );
}
