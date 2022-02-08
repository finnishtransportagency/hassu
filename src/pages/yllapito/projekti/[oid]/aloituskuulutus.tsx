import Textarea from "@components/form/Textarea";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { useRouter } from "next/router";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import useProjekti from "src/hooks/useProjekti";
import * as Yup from "yup";
import { SchemaOf } from "yup";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Button from "@components/button/Button";
import Notification, { NotificationType } from "@components/notification/Notification";
import {
  AloitusKuulutusInput,
  AloitusKuulutusTila,
  api,
  LaskuriTyyppi,
  Projekti,
  Status,
  TallennaProjektiInput,
} from "@services/api";
import log from "loglevel";
import { PageProps } from "@pages/_app";
import DatePicker from "@components/form/DatePicker";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import KuulutuksenYhteystiedot from "@components/projekti/aloituskuulutus/KuulutuksenYhteystiedot";
import { kayttoOikeudetSchema } from "src/schemas/kayttoOikeudet";
import { puhelinNumeroSchema } from "src/schemas/puhelinNumero";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import cloneDeep from "lodash/cloneDeep";
import useSnackbars from "src/hooks/useSnackbars";
import { aloituskuulutusSchema } from "src/schemas/aloituskuulutus";
import AloituskuulutusRO from "@components/projekti/aloituskuulutus/AloituskuulutusRO";

type ProjektiFields = Pick<TallennaProjektiInput, "oid" | "kayttoOikeudet">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
  aloitusKuulutus: Pick<
    AloitusKuulutusInput,
    "esitettavatYhteystiedot" | "kuulutusPaiva" | "hankkeenKuvaus" | "siirtyySuunnitteluVaiheeseen"
  >;
};

const maxAloituskuulutusLength = 2000;

const loadedProjektiValidationSchema = getProjektiValidationSchema([
  ProjektiTestType.PROJEKTI_IS_LOADED,
  ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
  ProjektiTestType.PROJEKTI_IS_CREATED,
]);

export default function Aloituskuulutus({ setRouteLabels }: PageProps): ReactElement {
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [serializedFormData, setSerializedFormData] = useState("{}");
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti(oid);
  const isLoadingProjekti = !projekti && !projektiLoadError;
  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const isIncorrectProjektiStatus = !projekti?.status || projekti?.status === Status.EI_JULKAISTU;
  const disableFormEdit =
    !projekti?.nykyinenKayttaja.omaaMuokkausOikeuden ||
    projektiHasErrors ||
    isLoadingProjekti ||
    isFormSubmitting ||
    isIncorrectProjektiStatus;
  const today = new Date().toISOString().split("T")[0];
  const pdfFormRef = useRef<HTMLFormElement | null>(null);
  const [formContext, setFormContext] = useState<Projekti | undefined>(undefined);

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

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(aloituskuulutusSchema, { abortEarly: false, recursive: true }),
    defaultValues: { aloitusKuulutus: { hankkeenKuvaus: "" } },
    mode: "onChange",
    reValidateMode: "onChange",
    context: formContext,
  };

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useFormReturn;

  const watchKuulutusPaiva = watch("aloitusKuulutus.kuulutusPaiva");

  useEffect(() => {
    if (projekti && projekti.oid) {
      const tallentamisTiedot: FormValues = {
        oid: projekti.oid,
        kayttoOikeudet:
          projekti.kayttoOikeudet?.map(({ kayttajatunnus, puhelinnumero, rooli, esitetaanKuulutuksessa }) => ({
            kayttajatunnus,
            puhelinnumero: puhelinnumero || "",
            rooli,
            esitetaanKuulutuksessa,
          })) || [],
        aloitusKuulutus: {
          hankkeenKuvaus: projekti?.aloitusKuulutus?.hankkeenKuvaus,
          kuulutusPaiva: projekti?.aloitusKuulutus?.kuulutusPaiva,
          siirtyySuunnitteluVaiheeseen: projekti?.aloitusKuulutus?.siirtyySuunnitteluVaiheeseen,
          esitettavatYhteystiedot:
            projekti?.aloitusKuulutus?.esitettavatYhteystiedot?.map((yhteystieto) => {
              if (yhteystieto) {
                const { __typename, ...yhteystietoInput } = yhteystieto;
                return yhteystietoInput;
              }
              return null;
            }) || [],
        },
      };
      setFormContext(projekti);
      reset(tallentamisTiedot);
    }
  }, [projekti, reset]);

  const saveAloituskuulutus = async (formData: FormValues) => {
    deleteFieldArrayIds(formData?.aloitusKuulutus?.esitettavatYhteystiedot);
    log.log("formData", formData);
    await api.tallennaProjekti(formData);
    await reloadProjekti();
  };

  const saveDraft = async (formData: FormValues) => {
    setIsFormSubmitting(true);
    try {
      await saveAloituskuulutus(formData);
      showSuccessMessage("Tallennus onnistui!");
    } catch (e) {
      log.log("OnSubmit Error", e);
      showErrorMessage("Tallennuksessa tapahtui virhe");
    }
    setIsFormSubmitting(false);
  };

  const sendToManager = async (formData: FormValues) => {
    setIsFormSubmitting(true);
    try {
      if (isDirty) {
        await saveAloituskuulutus(formData);
        // don't show succes toast we still want to send it to manager
      }
      await api.muutaTila(formData.oid, AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA);
      showSuccessMessage("Lähetys onnistui");
    } catch (error) {
      log.error("", error);
      showErrorMessage("Lähetyksessä tapahtui virhe");
    }
    setIsFormSubmitting(false);
  };

  const showPDFPreview = (formData: FormValues, action: string) => {
    const formDataToSend = cloneDeep(formData);
    deleteFieldArrayIds(formDataToSend?.aloitusKuulutus?.esitettavatYhteystiedot);
    setSerializedFormData(JSON.stringify(formDataToSend));
    if (pdfFormRef.current) {
      pdfFormRef.current.action = action;
      pdfFormRef.current?.submit();
    }
  };

  const { showSuccessMessage, showErrorMessage, showInfoMessage } = useSnackbars();

  const getPaattymispaiva = async (value: string) => {
    try {
      const paattymispaiva = await api.laskePaattymisPaiva(value, LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA);
      setValue("aloitusKuulutus.siirtyySuunnitteluVaiheeseen", paattymispaiva);
    } catch (error) {
      showErrorMessage("Kuulutuksen päättymispäivän laskennassa tapahtui virhe");
      log.error("Päättymispäivän laskennassa virhe", error);
    }
  };

  return (
    <ProjektiPageLayout title="Aloituskuulutus">
      { projekti?.aloitusKuulutus?.tila === AloitusKuulutusTila.MUOKATTAVISSA && (
        <>
        <form>
        <fieldset disabled={disableFormEdit}>
          <ProjektiErrorNotification
            projekti={projekti}
            validationSchema={loadedProjektiValidationSchema}
            disableValidation={isLoadingProjekti}
          />
          <Notification type={NotificationType.WARN}>
            Aloituskuulutusta ei ole vielä julkaistu palvelun julkisella puolella.{" "}
            {watchKuulutusPaiva && !errors.aloitusKuulutus?.kuulutusPaiva
              ? `Kuulutuspäivä on ${new Date(watchKuulutusPaiva).toLocaleDateString("fi")}`
              : "Kuulutuspäivää ei ole asetettu"}
            . Voit edelleen tehdä muutoksia projektin tietoihin. Tallennetut muutokset huomioidaan kuulutuksessa.
          </Notification>
          <h3 className="vayla-title">Suunnittelun aloittamisesta kuuluttaminen</h3>
          <p>
            Kun suunnitelman aloittamisesta kuulutetaan, projektista julkaistaan aloituskuulutustiedot tämän palvelun
            julkisella puolella. Aloituskuulutuksen näkyvilläoloaika määräytyy annetun kuulutuspäivän mukaan. Projekti
            siirtyy määräajan jälkeen automaattisesti suunnitteluvaiheeseen.
          </p>
          <Notification type={NotificationType.INFO} hideIcon>
            <div>
              <h3 className="vayla-small-title">Ohjeet</h3>
              <ul className="list-disc block pl-5">
                <li>
                  Anna päivämäärä, jolloin suunnittelun aloittamisesta kuulutetaan tämän palvelun julkisella puolella.
                </li>
                <li>
                  Kuvaa aloituskuulutuksessa esitettävään sisällönkuvauskenttään lyhyesti suunnittelukohteen alueellinen
                  rajaus (maantiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja toimenpiteet
                  pääpiirteittäin karkealla tasolla. Älä lisää tekstiin linkkejä.
                </li>
              </ul>
            </div>
          </Notification>
          <div className="lg:flex md:gap-x-8">
            <DatePicker
              label="Kuulutuspäivä *"
              className="md:max-w-min"
              {...register("aloitusKuulutus.kuulutusPaiva")}
              disabled={disableFormEdit}
              min={today}
              error={errors.aloitusKuulutus?.kuulutusPaiva}
              onChange={(event) => {
                getPaattymispaiva(event.target.value);
              }}
            />
            <DatePicker
              className="md:max-w-min"
              label="Kuulutusvaihe päättyy"
              readOnly
              {...register("aloitusKuulutus.siirtyySuunnitteluVaiheeseen")}
            />
          </div>
          <div className="content">
            <KuulutuksenYhteystiedot projekti={projekti} useFormReturn={useFormReturn} />
          </div>
          <Textarea
            label="Tiivistetty hankkeen sisällönkuvaus *"
            {...register("aloitusKuulutus.hankkeenKuvaus")}
            error={errors.aloitusKuulutus?.hankkeenKuvaus}
            maxLength={maxAloituskuulutusLength}
            disabled={disableFormEdit}
          />
          <Notification type={NotificationType.INFO}>
            Esikatsele kuulutus ja ilmoitus ennen hyväksyntään lähettämistä.
          </Notification>
          <div className="flex flex-col lg:flex-row gap-6">
            <Button
              type="submit"
              onClick={handleSubmit((formData) =>
                showPDFPreview(formData, `/api/projekti/${projekti?.oid}/aloituskuulutus/pdf`)
              )}
              disabled={disableFormEdit}
            >
              Esikatsele kuulutusta
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit((formData) =>
                showPDFPreview(formData, `/api/projekti/${projekti?.oid}/aloituskuulutus/ilmoitus/pdf`)
              )}
              disabled={disableFormEdit}
            >
              Esikatsele ilmoitusta
            </Button>
          </div>
        </fieldset>
      </form>
      <form ref={pdfFormRef} target="_blank" method="POST">
        <input type="hidden" name="tallennaProjektiInput" value={serializedFormData} />
      </form>
      <hr />
      <div className="flex gap-6 justify-between flex-wrap">
        <Button onClick={handleSubmit(saveDraft)} disabled={!isDirty || disableFormEdit}>
          Tallenna
        </Button>
        <Button primary onClick={handleSubmit(sendToManager)} disabled={isDirty}>
          Lähetä Hyväksyttäväksi
        </Button>
      </div>
      </>
      )}
      {projekti?.aloitusKuulutus?.tila === AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA && (
        <FormProvider {...useFormReturn}>
          <AloituskuulutusRO projekti={projekti}></AloituskuulutusRO>
        </FormProvider>
      )}
      
    </ProjektiPageLayout>
  );
}
