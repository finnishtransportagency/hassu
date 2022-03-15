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
import cloneDeep from "lodash/cloneDeep";
import find from "lodash/find";
import lowerCase from "lodash/lowerCase";
import useSnackbars from "src/hooks/useSnackbars";
import { aloituskuulutusSchema } from "src/schemas/aloituskuulutus";
import AloituskuulutusLukunakyma from "@components/projekti/aloituskuulutus/AloituskuulutusLukunakyma";
import IlmoituksenVastaanottajat from "@components/projekti/aloituskuulutus/IlmoituksenVastaanottajat";
import { GetServerSideProps } from "next";
import { setupLambdaMonitoring } from "backend/src/aws/monitoring";
import dayjs from "dayjs";
import useTranslation from "next-translate/useTranslation";
import WindowCloseButton from "@components/button/WindowCloseButton";
import { DialogContent, DialogTitle, Stack } from "@mui/material";
import HassuDialog from "@components/HassuDialog";
import { GetParameterCommandOutput, SSMClient } from "@aws-sdk/client-ssm";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuStack from "@components/layout/HassuStack";
import HassuGrid from "@components/HassuGrid";

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

function removeTypeName(o: any | null | undefined) {
  if (!o) {
    return o;
  }
  let result = { ...o };
  delete result["__typename"];
  return result;
}

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
  const [openHyvaksy, setOpenHyvaksy] = useState(false);
  const { t } = useTranslation("commonFI");

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
    defaultValues: { aloitusKuulutus: { hankkeenKuvaus: { SUOMI: "" } } },
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
    setValue,
  } = useFormReturn;

  const {
    register: register2,
    handleSubmit: handleSubmit2,
    formState: { errors: errors2 },
  } = useForm<PalautusValues>({ defaultValues: { syy: "" } });

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
          hankkeenKuvaus: removeTypeName(projekti?.aloitusKuulutus?.hankkeenKuvaus),
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
    await api.tallennaProjekti(formData);
    await reloadProjekti();
  };

  const saveDraft = async (formData: FormValues) => {
    setIsFormSubmitting(true);
    try {
      await saveAloituskuulutus(formData);
      showSuccessMessage("Tallennus onnistui!");
    } catch (e) {
      log.error("OnSubmit Error", e);
      showErrorMessage("Tallennuksessa tapahtui virhe");
    }
    setIsFormSubmitting(false);
  };

  const lahetaHyvaksyttavaksi = async (formData: FormValues) => {
    log.debug("tallenna tiedot ja lähetä hyväksyttäväksi");
    setIsFormSubmitting(true);
    try {
      await saveAloituskuulutus(formData);
      await vaihdaAloituskuulutuksenTila(TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI, "Lähetys");
    } catch (error) {
      log.error("Virhe hyväksyntään lähetyksessä", error);
      showErrorMessage("Hyväksyntään lähetyksessä tapahtui virhe");
    }
    setIsFormSubmitting(false);
  };

  const palautaMuokattavaksi = async (data: PalautusValues) => {
    log.debug("palauta muokattavaksi: ", data);
    await vaihdaAloituskuulutuksenTila(TilasiirtymaToiminto.HYLKAA, "Palautus", data.syy);
  };

  const palautaMuokattavaksiJaPoistu = async (data: PalautusValues) => {
    log.debug("palauta muokattavaksi ja poistu: ", data);
    await vaihdaAloituskuulutuksenTila(TilasiirtymaToiminto.HYLKAA, "Palautus", data.syy);
    const siirtymaTimer = setTimeout(() => {
      setIsFormSubmitting(true);
      router.push(`/yllapito/projekti/${projekti?.oid}`);
    }, 1000);
    return () => {
      setIsFormSubmitting(false);
      clearTimeout(siirtymaTimer);
    };
  };

  const hyvaksyKuulutus = async () => {
    log.debug("hyväksy kuulutus");
    await vaihdaAloituskuulutuksenTila(TilasiirtymaToiminto.HYVAKSY, "Hyväksyminen");
  };

  const vaihdaAloituskuulutuksenTila = async (toiminto: TilasiirtymaToiminto, viesti: string, syy?: string) => {
    if (!projekti) {
      return;
    }
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

  const handleClickOpenHyvaksy = () => {
    setOpenHyvaksy(true);
  };

  const handleClickCloseHyvaksy = () => {
    setOpenHyvaksy(false);
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
    return <div>Kielitiedot puttuu</div>;
  }
  const kielitiedot = projekti.kielitiedot;
  const toissijainenKieli = kielitiedot.toissijainenKieli;
  const voiMuokata = !projekti?.aloitusKuulutusJulkaisut || projekti.aloitusKuulutusJulkaisut.length < 1;
  const voiHyvaksya =
    getAloituskuulutusjulkaisuByTila(AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA) &&
    projekti?.nykyinenKayttaja.onProjektipaallikko;
  const odottaaJulkaisua = () => {
    const julkaisu = getAloituskuulutusjulkaisuByTila(AloitusKuulutusTila.HYVAKSYTTY);
    if (julkaisu) {
      // Toistaiseksi tarkastellaan julkaisupaivatietoa, koska ei ole olemassa erillista tilaa julkaistulle kuulutukselle
      const julkaisupvm = dayjs(julkaisu.kuulutusPaiva);
      if (dayjs().isBefore(julkaisupvm, "day")) {
        return julkaisupvm.format("DD.MM.YYYY");
      }
    }
  };

  return (
    <ProjektiPageLayout title="Aloituskuulutus">
      {voiMuokata && (
        <>
          <FormProvider {...useFormReturn}>
            <form>
              <fieldset style={{ display: "contents" }} disabled={disableFormEdit}>
                <Section>
                  <ProjektiErrorNotification
                    projekti={projekti}
                    validationSchema={loadedProjektiValidationSchema}
                    disableValidation={isLoadingProjekti}
                  />
                  {projekti.aloitusKuulutus?.palautusSyy && (
                    <Notification type={NotificationType.WARN}>
                      Aloituskuulutus on palautettu korjattavaksi. Palautuksen syy:{" "}
                      {projekti.aloitusKuulutus.palautusSyy}
                    </Notification>
                  )}
                  {odottaaJulkaisua() && (
                    <Notification type={NotificationType.WARN}>
                      {`Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä ${odottaaJulkaisua()}`}.
                    </Notification>
                  )}
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
                  <HassuGrid cols={{ lg: 3 }}>
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
                  </HassuGrid>
                </Section>
                <KuulutuksenYhteystiedot projekti={projekti} useFormReturn={useFormReturn} />
                <Section noDivider={!!toissijainenKieli}>
                  <SectionContent>
                    <h5 className="vayla-small-title">Hankkeen sisällönkuvaus</h5>
                    <p>
                      Kirjoita aloituskuulutusta varten tiivistetty sisällönkuvaus hankkeesta. Kuvauksen on hyvä
                      sisältää esimerkiksi tieto suunnittelukohteen alueellista rajauksesta (maantiealue ja
                      vaikutusalue), suunnittelun tavoitteet, vaikutukset ja toimenpiteet pääpiirteittäin karkealla
                      tasolla. Älä lisää tekstiin linkkejä.{" "}
                    </p>
                  </SectionContent>
                  <Textarea
                    label={`Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä (${lowerCase(
                      kielitiedot.ensisijainenKieli
                    )}) *`}
                    {...register(`aloitusKuulutus.hankkeenKuvaus.${kielitiedot.ensisijainenKieli}`)}
                    error={(errors.aloitusKuulutus?.hankkeenKuvaus as any)?.[kielitiedot.ensisijainenKieli]}
                    maxLength={maxAloituskuulutusLength}
                    disabled={disableFormEdit}
                  />
                  <Notification type={NotificationType.INFO_GRAY}>
                    Esikatsele kuulutus ja ilmoitus ennen hyväksyntään lähettämistä.
                  </Notification>

                  <HassuStack direction={["column", "column", "row"]}>
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
                      Kuulutuksen esikatselu
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
                      Ilmoituksen esikatselu
                    </Button>
                  </HassuStack>
                </Section>
                {toissijainenKieli && (
                  <Section>
                    <Textarea
                      label={`Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (${lowerCase(
                        toissijainenKieli
                      )}) *`}
                      {...register(`aloitusKuulutus.hankkeenKuvaus.${toissijainenKieli}`)}
                      error={(errors.aloitusKuulutus?.hankkeenKuvaus as any)?.[toissijainenKieli]}
                      maxLength={maxAloituskuulutusLength}
                      disabled={disableFormEdit}
                    />
                    <Notification type={NotificationType.INFO_GRAY}>
                      Esikatsele kuulutus ja ilmoitus ennen hyväksyntään lähettämistä.
                    </Notification>
                    <HassuStack direction={["column", "column", "row"]}>
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
                        Kuulutuksen esikatselu
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
                        Ilmoituksen esikatselu
                      </Button>
                    </HassuStack>
                  </Section>
                )}
                <IlmoituksenVastaanottajat isLoading={isLoadingProjekti} kirjaamoOsoitteet={kirjaamoOsoitteet || []} />
              </fieldset>
            </form>
          </FormProvider>
          <form ref={pdfFormRef} target="_blank" method="POST">
            <input type="hidden" name="tallennaProjektiInput" value={serializedFormData} />
          </form>
          <Section noDivider>
            <Stack justifyContent={[undefined, undefined, "flex-end"]} direction={["column", "column", "row"]}>
              <Button onClick={handleSubmit(saveDraft)} disabled={disableFormEdit}>
                Tallenna tiedot
              </Button>
              <Button primary onClick={handleSubmit(lahetaHyvaksyttavaksi)}>
                Tallenna ja lähetä Hyväksyttäväksi
              </Button>
            </Stack>
          </Section>
        </>
      )}
      {!voiMuokata && (
        <FormProvider {...useFormReturn}>
          <AloituskuulutusLukunakyma
            oid={projekti?.oid}
            aloituskuulutusjulkaisu={
              getAloituskuulutusjulkaisuByTila(AloitusKuulutusTila.HYVAKSYTTY) ||
              getAloituskuulutusjulkaisuByTila(AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA)
            }
            isLoadingProjekti={isLoadingProjekti}
            kirjaamoOsoitteet={kirjaamoOsoitteet || []}
          ></AloituskuulutusLukunakyma>
        </FormProvider>
      )}

      {voiHyvaksya && (
        <>
          <Section noDivider>
            <Stack direction={["column", "column", "row"]} justifyContent={[undefined, undefined, "flex-end"]}>
              <Button onClick={handleClickOpen}>Palauta</Button>
              <Button primary onClick={handleClickOpenHyvaksy}>
                Hyväksy ja lähetä
              </Button>
            </Stack>
          </Section>
          <div>
            <HassuDialog open={open} onClose={handleClickClose}>
              <DialogTitle>
                <div className="vayla-dialog-title">Kuulutuksen palauttaminen</div>
              </DialogTitle>
              <DialogContent>
                <form>
                  <p>
                    Olet palauttamassa kuulutuksen korjattavaksi. Kuulutuksen tekijä saa tiedon palautuksesta ja sen
                    syystä. Saat ilmoituksen, kun kuulutus on taas valmis hyväksyttäväksi. Jos haluat itse muokata
                    kuulutusta ja hyväksyä tehtyjen muutoksien jälkeen, valitse Palauta ja muokkaa.
                  </p>
                  <Textarea
                    label="Syy palautukselle *"
                    {...register2("syy", { required: "Palautuksen syy täytyy antaa" })}
                    error={errors2.syy}
                    maxLength={200}
                    hideLengthCounter={false}
                  ></Textarea>
                  <div className="flex gap-6 justify-end pt-6">
                    <Button primary onClick={handleSubmit2(palautaMuokattavaksiJaPoistu)}>
                      Palauta ja poistu
                    </Button>
                    <Button onClick={handleSubmit2(palautaMuokattavaksi)}>Palauta ja muokkaa</Button>
                    <Button
                      onClick={(e) => {
                        handleClickClose();
                        e.preventDefault();
                      }}
                    >
                      Peruuta
                    </Button>
                    <WindowCloseButton
                      onClick={() => {
                        handleClickClose();
                      }}
                    ></WindowCloseButton>
                  </div>
                </form>
              </DialogContent>
            </HassuDialog>
          </div>
          <div>
            <HassuDialog open={openHyvaksy} onClose={handleClickCloseHyvaksy}>
              <DialogTitle>
                <div className="vayla-dialog-title ">Kuulutuksen hyväksyminen ja ilmoituksen lähettäminen</div>
              </DialogTitle>
              <DialogContent>
                <form>
                  <p>
                    Olet hyväksymässä kuulutuksen ja käynnistämässä siihen liittyvän ilmoituksen automaattisen
                    lähettämisen. Ilmoitus kuulutuksesta lähetetään seuraaville:
                  </p>
                  <div className="content">
                    <p>Viranomaiset</p>
                    <ul className="vayla-dialog-list">
                      {projekti?.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) => (
                        <li key={viranomainen.nimi}>
                          {t(`viranomainen.${viranomainen.nimi}`)}, {viranomainen.sahkoposti}
                        </li>
                      ))}
                    </ul>
                    <p>Kunnat</p>
                    <ul className="vayla-dialog-list">
                      {projekti?.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat?.map((kunta) => (
                        <li key={kunta.nimi}>
                          {kunta.nimi}, {kunta.sahkoposti}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="content">
                    <p>
                      Jos aloituskuulutukseen pitää tehdä muutoksia hyväksymisen jälkeen, tulee aloituskuulutus avata
                      uudelleen ja lähettää päivitetyt ilmoitukset asianosaisille. Kuulutuspäivän jälkeen tulevat
                      muutostarpeet vaativat aloituksen uudelleen kuuluttamisen.
                    </p>
                    <p>
                      Klikkaamalla Hyväksy ja lähetä -painiketta vahvistat kuulutuksen tarkastetuksi ja hyväksyt sen
                      julkaisun kuulutuspäivänä sekä ilmoituksien lähettämisen. Ilmoitukset lähetetään automaattisesti
                      painikkeen klikkaamisen jälkeen.
                    </p>
                  </div>
                  <div className="flex gap-6 justify-end pt-6">
                    <Button primary onClick={handleSubmit(hyvaksyKuulutus)}>
                      Hyväksy ja lähetä
                    </Button>
                    <Button
                      onClick={(e) => {
                        handleClickCloseHyvaksy();
                        e.preventDefault();
                      }}
                    >
                      Peruuta
                    </Button>
                    <WindowCloseButton
                      onClick={() => {
                        handleClickCloseHyvaksy();
                      }}
                    ></WindowCloseButton>
                  </div>
                </form>
              </DialogContent>
            </HassuDialog>
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
    const ssmclient: SSMClient = await getSSMClient();
    const response: GetParameterCommandOutput = await ssmclient.send(new GetParameterCommand({ Name: parameterName }));
    kirjaamoOsoitteet = response.Parameter?.Value ? JSON.parse(response.Parameter.Value) : [];
  } catch (e) {
    log.error(`Could not pass prop 'kirjaamoOsoitteet' to 'aloituskuulutus' page`, e);
  }

  return {
    props: { kirjaamoOsoitteet }, // will be passed to the page component as props
  };
};
