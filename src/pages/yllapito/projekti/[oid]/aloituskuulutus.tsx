import Textarea from "@components/form/Textarea";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { useRouter } from "next/router";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import useProjekti from "src/hooks/useProjekti";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Button from "@components/button/Button";
import Notification, { NotificationType } from "@components/notification/Notification";
import {
  AloitusKuulutusInput,
  AloitusKuulutusJulkaisu,
  AloitusKuulutusTila,
  api,
  Kieli,
  LaskuriTyyppi,
  Projekti,
  Status,
  TallennaProjektiInput,
  TilasiirtymaToiminto,
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
import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import TextInput from "@components/form/TextInput";

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

type PalautusValues = {
  syy: string;
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
  const [open, setOpen] = useState(false);

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

  const {
    register: register2,
    handleSubmit: handleSubmit2,
    formState: { errors: errors2 },
  } = useForm<PalautusValues>({ defaultValues: { syy: "" } });

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
    if (!projekti?.aloitusKuulutusJulkaisut) {
      return undefined;
    }
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

  const lahetaHyvaksyttavaksi = async () => {
    log.log("lähetä hyväksyttäväksi");
    //await vaihdaAloituskuulutuksenTila(TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI, "Lähetys");
  };

  const palautaMuokattavaksi = async (data: PalautusValues) => {
    log.log("palauta muokattavaksi: ", data);
    await vaihdaAloituskuulutuksenTila(TilasiirtymaToiminto.HYLKAA, "Palautus", data.syy);
  };

  const hyvaksyKuulutus = async () => {
    log.log("hyväksy kuulutus");
    await vaihdaAloituskuulutuksenTila(TilasiirtymaToiminto.HYVAKSY, "Hyväksyminen");
  };

  const vaihdaAloituskuulutuksenTila = async (toiminto: TilasiirtymaToiminto, viesti: string, syy?: string) => {
    if (!projekti) return;
    setIsFormSubmitting(true);
    try {
      await api.siirraTila({ oid: projekti.oid, toiminto, syy });
      await reloadProjekti();
      showSuccessMessage(`${viesti} onnistui`);
    } catch (error) {
      log.error(error);
      showErrorMessage("Toiminnossa tapahtui virhe");
    }
    setIsFormSubmitting(false);
    setOpen(false);
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClickClose = () => {
    setOpen(false);
  };

  const showPDFPreview = (formData: FormValues, action: string, kieli: Kieli) => {
    const formDataToSend = cloneDeep(formData);
    deleteFieldArrayIds(formDataToSend?.aloitusKuulutus?.esitettavatYhteystiedot);
    deleteFieldArrayIds(formDataToSend?.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat);
    deleteFieldArrayIds(formDataToSend?.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset);
    setSerializedFormData(JSON.stringify(formDataToSend));
    if (pdfFormRef.current) {
      pdfFormRef.current.action = action + "?kieli=" + kieli;
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

  if (!projekti) {
    return <div />;
  }
  if (!projekti.kielitiedot) {
    return <div />;
  }
  const kielitiedot = projekti.kielitiedot;
  const toissijainenKieli = kielitiedot.toissijainenKieli;
  const voiMuokata = !projekti?.aloitusKuulutusJulkaisut || projekti.aloitusKuulutusJulkaisut.length < 1;
  const voiHyvaksya =
    getAloituskuulutusjulkaisuByTila(AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA) &&
    projekti?.nykyinenKayttaja.onProjektipaallikko;

  return (
    <ProjektiPageLayout title="Aloituskuulutus">
      {voiMuokata && (
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

                <div className="content">
                  <p className="vayla-label">Esikatseltavat tiedostot</p>
                  <p>Kuulutus ja ilmoitus ensisijaisella kielellä ({kielitiedot.ensisijainenKieli})</p>
                  <div className="flex flex-col lg:flex-row gap-6">
                    <Button
                      type="submit"
                      onClick={handleSubmit((formData) =>
                        showPDFPreview(
                          formData,
                          `/api/projekti/${projekti?.oid}/aloituskuulutus/pdf`,
                          kielitiedot.ensisijainenKieli
                        )
                      )}
                      disabled={disableFormEdit}
                    >
                      Esikatsele kuulutusta
                    </Button>
                    <Button
                      type="submit"
                      onClick={handleSubmit((formData) =>
                        showPDFPreview(
                          formData,
                          `/api/projekti/${projekti?.oid}/aloituskuulutus/ilmoitus/pdf`,
                          kielitiedot.ensisijainenKieli
                        )
                      )}
                      disabled={disableFormEdit}
                    >
                      Esikatsele ilmoitusta
                    </Button>
                  </div>
                </div>

                {toissijainenKieli && (
                  <div className="content">
                    <p>Kuulutus ja ilmoitus toissijaisella kielellä ({toissijainenKieli})</p>
                    <div className="flex flex-col lg:flex-row gap-6">
                      <Button
                        type="submit"
                        onClick={handleSubmit((formData) =>
                          showPDFPreview(
                            formData,
                            `/api/projekti/${projekti?.oid}/aloituskuulutus/pdf`,
                            toissijainenKieli
                          )
                        )}
                        disabled={disableFormEdit}
                      >
                        Esikatsele kuulutusta
                      </Button>
                      <Button
                        type="submit"
                        onClick={handleSubmit((formData) =>
                          showPDFPreview(
                            formData,
                            `/api/projekti/${projekti?.oid}/aloituskuulutus/ilmoitus/pdf`,
                            toissijainenKieli
                          )
                        )}
                        disabled={disableFormEdit}
                      >
                        Esikatsele ilmoitusta
                      </Button>
                    </div>
                  </div>
                )}
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
            <Button primary onClick={handleSubmit(lahetaHyvaksyttavaksi)} disabled={isDirty}>
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

      {voiHyvaksya && (
        <>
          <div className="flex gap-6 justify-end">
            <Button onClick={handleClickOpen}>Palauta</Button>
            <Button primary onClick={handleSubmit(hyvaksyKuulutus)}>
              Hyväksy ja lähetä
            </Button>
          </div>
          <div>
            <Dialog open={open} onClose={handleClickClose} fullWidth={true} maxWidth={"md"}>
              <DialogTitle>
                <b>Kuulutuksen palauttaminen</b>
              </DialogTitle>
              <DialogContent>
                <form>
                  <p>
                    Olet palauttamassa kuulutuksen korjattavaksi. Kuulutuksen tekijä saa tiedon palautuksesta ja sen
                    syystä. Saat ilmoituksen, kun kuulutus on taas valmis hyväksyttäväksi. Jos haluat itse muokata
                    kuulutusta ja hyväksyä tehtyjen muutoksien jälkeen, valitse Palauta ja muokkaa.
                  </p>
                  <TextInput
                    label="Syy palautukselle *"
                    {...register2("syy", { required: "Palautuksen syy täytyy antaa" })}
                    error={errors2.syy}
                    maxLength={200}
                    hideLengthCounter={false}
                  ></TextInput>
                  <div className="flex gap-6 justify-end">
                    <Button primary onClick={handleSubmit2(palautaMuokattavaksi)}>
                      Palauta ja poistu
                    </Button>
                    <Button
                      onClick={(e) => {
                        handleClickClose();
                        e.preventDefault();
                      }}
                    >
                      Palauta ja muokkaa
                    </Button>
                    <Button
                      onClick={(e) => {
                        handleClickClose();
                        e.preventDefault();
                      }}
                    >
                      Peruuta
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </>
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
