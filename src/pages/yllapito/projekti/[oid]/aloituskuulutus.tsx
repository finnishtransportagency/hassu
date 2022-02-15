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
  AloitusKuulutusJulkaisu,
  TilasiirtymaToiminto,
  IlmoitettavaViranomainen,
  ViranomaisVastaanottajaInput,
} from "@services/api";
import log from "loglevel";
import { PageProps } from "@pages/_app";
import DatePicker from "@components/form/DatePicker";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import KuulutuksenYhteystiedot from "@components/projekti/aloituskuulutus/KuulutuksenYhteystiedot";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import { cloneDeep, find } from "lodash";
import useSnackbars from "src/hooks/useSnackbars";
import { aloituskuulutusSchema } from "src/schemas/aloituskuulutus";
import AloituskuulutusRO from "@components/projekti/aloituskuulutus/AloituskuulutusRO";
import IlmoituksenVastaanottajat from "@components/projekti/aloituskuulutus/IlmoituksenVastaanottajat";
import { GetServerSideProps } from "next";
import { setupLambdaMonitoring } from "backend/src/aws/monitoring";

type ProjektiFields = Pick<TallennaProjektiInput, "oid" | "kayttoOikeudet">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
  aloitusKuulutus: Pick<
    AloitusKuulutusInput,
    | "esitettavatYhteystiedot"
    | "kuulutusPaiva"
    | "hankkeenKuvaus"
    | "siirtyySuunnitteluVaiheeseen"
    | "ilmoituksenVastaanottajat"
  >;
};

const maxAloituskuulutusLength = 2000;

const loadedProjektiValidationSchema = getProjektiValidationSchema([
  ProjektiTestType.PROJEKTI_IS_LOADED,
  ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
  ProjektiTestType.PROJEKTI_IS_CREATED,
]);

export default function Aloituskuulutus({
  setRouteLabels,
  kirjaamoOsoitteet,
}: PageProps & ServerSideProps): ReactElement {
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
    if (projekti?.oid) {
      const kuntaNimet: string[] = [
        ...new Set([
          ...(projekti.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat?.map(({ nimi }) => nimi) || []),
          ...(projekti.velho.kunnat || []),
        ]),
      ];

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
          ilmoituksenVastaanottajat: {
            kunnat: kuntaNimet.map((nimi) => ({
              nimi,
              sahkoposti:
                projekti?.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat?.find((kunta) => kunta.nimi === nimi)
                  ?.sahkoposti || "",
            })),
            viranomaiset:
              projekti.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset?.map(({ nimi, sahkoposti }) => ({
                nimi,
                sahkoposti,
              })) || [],
          },
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
      reset(tallentamisTiedot, { keepDirty: true, keepTouched: true });
    }
  }, [projekti, reset]);

  const getAloituskuulutusjulkaisuByTila = (tila: AloitusKuulutusTila): AloitusKuulutusJulkaisu | undefined => {
    if (!projekti?.aloitusKuulutusJulkaisut) return undefined;
    return find(projekti.aloitusKuulutusJulkaisut, (julkaisu) => {
      return julkaisu.tila === tila;
    });
  };

  const saveAloituskuulutus = async (formData: FormValues) => {
    deleteFieldArrayIds(formData?.aloitusKuulutus?.esitettavatYhteystiedot);
    deleteFieldArrayIds(formData?.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat);
    deleteFieldArrayIds(formData?.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset);
    setIsFormSubmitting(true);
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

  const sendToManager = async () => {
    if (!projekti) return;
    setIsFormSubmitting(true);
    try {
      if (isDirty) {
        // should we even allow user to try sending to manager if form is dirty?
        // await saveAloituskuulutus(formData);
        // don't show succes toast we still want to send it to manager
      }
      await api.siirraTila({ oid: projekti.oid, toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI });
      await reloadProjekti();
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
    deleteFieldArrayIds(formDataToSend?.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat);
    deleteFieldArrayIds(formDataToSend?.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset);
    setSerializedFormData(JSON.stringify(formDataToSend));
    if (pdfFormRef.current) {
      pdfFormRef.current.action = action;
      pdfFormRef.current?.submit();
    }
  };

  const { showSuccessMessage, showErrorMessage } = useSnackbars();

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
      {!projekti?.aloitusKuulutusJulkaisut && (
        <>
          <FormProvider {...useFormReturn}>
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
                  Kun suunnitelman aloittamisesta kuulutetaan, projektista julkaistaan aloituskuulutustiedot tämän
                  palvelun julkisella puolella. Aloituskuulutuksen näkyvilläoloaika määräytyy annetun kuulutuspäivän
                  mukaan. Projekti siirtyy määräajan jälkeen automaattisesti suunnitteluvaiheeseen.
                </p>
                <Notification type={NotificationType.INFO} hideIcon>
                  <div>
                    <h3 className="vayla-small-title">Ohjeet</h3>
                    <ul className="list-disc block pl-5">
                      <li>
                        Anna päivämäärä, jolloin suunnittelun aloittamisesta kuulutetaan tämän palvelun julkisella
                        puolella.
                      </li>
                      <li>
                        Kuvaa aloituskuulutuksessa esitettävään sisällönkuvauskenttään lyhyesti suunnittelukohteen
                        alueellinen rajaus (maantiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja
                        toimenpiteet pääpiirteittäin karkealla tasolla. Älä lisää tekstiin linkkejä.
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
                <div className="content">
                  <IlmoituksenVastaanottajat
                    isLoading={isLoadingProjekti}
                    kirjaamoOsoitteet={kirjaamoOsoitteet || []}
                  />
                </div>
              </fieldset>
            </form>
          </FormProvider>
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
      {getAloituskuulutusjulkaisuByTila(AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA) && (
        <FormProvider {...useFormReturn}>
          <AloituskuulutusRO
            oid={projekti?.oid}
            aloituskuulutusjulkaisu={getAloituskuulutusjulkaisuByTila(AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA)}
          ></AloituskuulutusRO>
        </FormProvider>
      )}
    </ProjektiPageLayout>
  );
}

interface ServerSideProps {
  kirjaamoOsoitteet?: ViranomaisVastaanottajaInput[];
}

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async () => {
  setupLambdaMonitoring();
  const { getSSMClient } = require("../../../../../backend/src/aws/clients");
  const { GetParameterCommand } = require("@aws-sdk/client-ssm");
  const parameterName = "/kirjaamoOsoitteet";
  let kirjaamoOsoitteet: ViranomaisVastaanottajaInput[] = [];
  try {
    const kirjaamoOsoitteetJSON = await getSSMClient().send(new GetParameterCommand({ Name: parameterName }))?.Parameter
      ?.Value;
    kirjaamoOsoitteet = kirjaamoOsoitteetJSON ? JSON.parse(kirjaamoOsoitteetJSON) : [];
  } catch (e) {
    log.error(`Could not pass prop 'kirjaamoOsoitteet' to 'aloituskuulutus' page`, e);
  }

  return {
    props: { kirjaamoOsoitteet }, // will be passed to the page component as props
  };
};
