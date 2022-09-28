import Textarea from "@components/form/Textarea";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { useRouter } from "next/router";
import React, { ReactElement, useCallback, useMemo, useState } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
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
  Kielitiedot,
  LaskuriTyyppi,
  Status,
  TallennaProjektiInput,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  AsiakirjaTyyppi,
  HankkeenKuvauksetInput,
  YhteystietoInput,
} from "@services/api";
import log from "loglevel";
import { PageProps } from "@pages/_app";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import KuulutuksenYhteystiedot from "@components/projekti/aloituskuulutus/KuulutuksenYhteystiedot";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import find from "lodash/find";
import lowerCase from "lodash/lowerCase";
import useSnackbars from "src/hooks/useSnackbars";
import { aloituskuulutusSchema } from "src/schemas/aloituskuulutus";
import AloituskuulutusLukunakyma from "@components/projekti/aloituskuulutus/AloituskuulutusLukunakyma";
import IlmoituksenVastaanottajat from "@components/projekti/aloituskuulutus/IlmoituksenVastaanottajat";
import dayjs from "dayjs";
import useTranslation from "next-translate/useTranslation";
import { DialogActions, DialogContent, Stack } from "@mui/material";
import HassuDialog from "@components/HassuDialog";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuStack from "@components/layout/HassuStack";
import HassuGrid from "@components/HassuGrid";
import HassuSpinner from "@components/HassuSpinner";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import { pickBy } from "lodash";
import { removeTypeName } from "src/util/removeTypeName";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { today } from "src/util/dateUtils";

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
  aloitusKuulutus: Pick<
    AloitusKuulutusInput,
    "kuulutusYhteystiedot" | "kuulutusPaiva" | "hankkeenKuvaus" | "siirtyySuunnitteluVaiheeseen" | "ilmoituksenVastaanottajat"
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

export default function AloituskuulutusPage({ setRouteLabels }: PageProps): ReactElement {
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti({ revalidateOnMount: true });
  useProjektiBreadcrumbs(setRouteLabels);

  return (
    <>{projekti && <AloituskuulutusForm projekti={projekti} projektiLoadError={projektiLoadError} reloadProjekti={reloadProjekti} />}</>
  );
}

interface AloituskuulutusFormProps {
  projekti: ProjektiLisatiedolla;
  projektiLoadError: any;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
}

function AloituskuulutusForm({ projekti, projektiLoadError, reloadProjekti }: AloituskuulutusFormProps): ReactElement {
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const router = useRouter();
  const isLoadingProjekti = !projekti && !projektiLoadError;
  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const isIncorrectProjektiStatus = !projekti?.status || projekti?.status === Status.EI_JULKAISTU;

  const defaultValues: FormValues = useMemo(() => {
    const kuntaNimet: string[] = [
      ...new Set([
        ...(projekti.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat?.map(({ nimi }) => nimi) || []),
        ...(projekti.velho.kunnat || []),
      ]),
    ];

    const yhteysTiedot: YhteystietoInput[] =
      projekti?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot?.map((yt) => removeTypeName(yt)) || [];

    const yhteysHenkilot: string[] = projekti?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysHenkilot || [];
    const { ensisijainenKieli, toissijainenKieli } = projekti.kielitiedot || {};

    const hasRuotsinKieli = ensisijainenKieli === Kieli.RUOTSI || toissijainenKieli === Kieli.RUOTSI;
    const hasSaamenKieli = ensisijainenKieli === Kieli.SAAME || toissijainenKieli === Kieli.SAAME;

    // SUOMI hankkeen kuvaus on aina lomakkeella, RUOTSI JA SAAME vain jos kyseinen kieli on projektin kielitiedoissa.
    // Jos kieli ei ole kielitiedoissa kyseisen kielen kenttää ei tule lisätä hankkeenKuvaus olioon
    // Tästä syystä pickBy:llä poistetaan undefined hankkeenkuvaus tiedot.
    const hankkeenKuvaus: HankkeenKuvauksetInput = {
      SUOMI: projekti.aloitusKuulutus?.hankkeenKuvaus?.SUOMI || "",
      ...pickBy(
        {
          RUOTSI: hasRuotsinKieli ? projekti.aloitusKuulutus?.hankkeenKuvaus?.RUOTSI || "" : undefined,
          SAAME: hasSaamenKieli ? projekti.aloitusKuulutus?.hankkeenKuvaus?.SAAME || "" : undefined,
        },
        (value) => value !== undefined
      ),
    };

    const tallentamisTiedot: FormValues = {
      oid: projekti.oid,
      aloitusKuulutus: {
        ilmoituksenVastaanottajat: {
          kunnat: kuntaNimet.map((nimi) => ({
            nimi,
            sahkoposti:
              projekti?.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat?.find((kunta) => kunta.nimi === nimi)?.sahkoposti || "",
          })),
          viranomaiset:
            projekti.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset?.map(({ nimi, sahkoposti }) => ({
              nimi,
              sahkoposti,
            })) || [],
        },
        hankkeenKuvaus,
        kuulutusPaiva: projekti?.aloitusKuulutus?.kuulutusPaiva,
        siirtyySuunnitteluVaiheeseen: projekti?.aloitusKuulutus?.siirtyySuunnitteluVaiheeseen,
        kuulutusYhteystiedot: {
          yhteysTiedot,
          yhteysHenkilot,
        },
      },
    };
    return tallentamisTiedot;
  }, [projekti]);

  const disableFormEdit =
    !projekti?.nykyinenKayttaja.omaaMuokkausOikeuden ||
    projektiHasErrors ||
    isLoadingProjekti ||
    isFormSubmitting ||
    isIncorrectProjektiStatus;
  const [open, setOpen] = useState(false);
  const [openHyvaksy, setOpenHyvaksy] = useState(false);
  const { t } = useTranslation("commonFI");

  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(aloituskuulutusSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    context: projekti,
  };

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const {
    register: register2,
    handleSubmit: handleSubmit2,
    formState: { errors: errors2 },
  } = useForm<PalautusValues>({ defaultValues: { syy: "" } });

  const getAloituskuulutusjulkaisuByTila = useCallback(
    (tila: AloitusKuulutusTila): AloitusKuulutusJulkaisu | undefined => {
      if (!projekti?.aloitusKuulutusJulkaisut) {
        return undefined;
      }
      return find(projekti.aloitusKuulutusJulkaisut, (julkaisu) => {
        return julkaisu.tila === tila;
      });
    },
    [projekti]
  );

  const saveAloituskuulutus = useCallback(
    async (formData: FormValues) => {
      deleteFieldArrayIds(formData?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot);
      deleteFieldArrayIds(formData?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysHenkilot);
      deleteFieldArrayIds(formData?.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat);
      deleteFieldArrayIds(formData?.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset);
      setIsFormSubmitting(true);
      await api.tallennaProjekti(formData);
      await reloadProjekti();
      reset(formData);
    },
    [reset, reloadProjekti]
  );

  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const saveDraft = useCallback(
    async (formData: FormValues) => {
      setIsFormSubmitting(true);
      try {
        await saveAloituskuulutus(formData);
        showSuccessMessage("Tallennus onnistui!");
      } catch (e) {
        log.error("OnSubmit Error", e);
        showErrorMessage("Tallennuksessa tapahtui virhe");
      }
      setIsFormSubmitting(false);
    },
    [saveAloituskuulutus, showSuccessMessage, showErrorMessage]
  );

  const vaihdaAloituskuulutuksenTila = useCallback(
    async (toiminto: TilasiirtymaToiminto, viesti: string, syy?: string) => {
      if (!projekti) {
        return;
      }
      setIsFormSubmitting(true);
      try {
        await api.siirraTila({ oid: projekti.oid, toiminto, syy, tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS });
        await reloadProjekti();
        showSuccessMessage(`${viesti} onnistui`);
      } catch (error) {
        log.error(error);
        showErrorMessage("Toiminnossa tapahtui virhe");
      }
      setIsFormSubmitting(false);
      setOpen(false);
    },
    [setIsFormSubmitting, reloadProjekti, showSuccessMessage, showErrorMessage, setOpen, projekti]
  );

  const lahetaHyvaksyttavaksi = useCallback(
    async (formData: FormValues) => {
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
    },
    [setIsFormSubmitting, saveAloituskuulutus, vaihdaAloituskuulutuksenTila, showErrorMessage]
  );

  const palautaMuokattavaksi = useCallback(
    async (data: PalautusValues) => {
      log.debug("palauta muokattavaksi: ", data);
      await vaihdaAloituskuulutuksenTila(TilasiirtymaToiminto.HYLKAA, "Palautus", data.syy);
    },
    [vaihdaAloituskuulutuksenTila]
  );

  const palautaMuokattavaksiJaPoistu = useCallback(
    async (data: PalautusValues) => {
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
    },
    [vaihdaAloituskuulutuksenTila, setIsFormSubmitting, projekti, router]
  );

  const hyvaksyKuulutus = useCallback(async () => {
    log.debug("hyväksy kuulutus");
    await vaihdaAloituskuulutuksenTila(TilasiirtymaToiminto.HYVAKSY, "Hyväksyminen");
  }, [vaihdaAloituskuulutuksenTila]);

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

  const getPaattymispaiva = useCallback(
    async (value: string) => {
      try {
        const paattymispaiva = await api.laskePaattymisPaiva(value, LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA);
        setValue("aloitusKuulutus.siirtyySuunnitteluVaiheeseen", paattymispaiva);
      } catch (error) {
        showErrorMessage("Kuulutuksen päättymispäivän laskennassa tapahtui virhe");
        log.error("Päättymispäivän laskennassa virhe", error);
      }
    },
    [setValue, showErrorMessage]
  );

  const kielitiedot: Kielitiedot | null | undefined = projekti?.kielitiedot;
  const voiMuokata = !projekti?.aloitusKuulutusJulkaisut || projekti.aloitusKuulutusJulkaisut.length < 1;
  const voiHyvaksya =
    getAloituskuulutusjulkaisuByTila(AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA) && projekti?.nykyinenKayttaja.onProjektipaallikko;

  const odottaaJulkaisua = useMemo(() => {
    const julkaisu = getAloituskuulutusjulkaisuByTila(AloitusKuulutusTila.HYVAKSYTTY);
    if (julkaisu) {
      // Toistaiseksi tarkastellaan julkaisupaivatietoa, koska ei ole olemassa erillista tilaa julkaistulle kuulutukselle
      const julkaisupvm = dayjs(julkaisu.kuulutusPaiva);
      if (dayjs().isBefore(julkaisupvm, "day")) {
        return julkaisupvm.format("DD.MM.YYYY");
      }
    }
    return null;
  }, [getAloituskuulutusjulkaisuByTila]);

  if (!projekti || isLoadingProjekti) {
    return <div />;
  }
  if (!kielitiedot) {
    return <div>Kielitiedot puttuu</div>;
  }

  const migroitu = getAloituskuulutusjulkaisuByTila(AloitusKuulutusTila.MIGROITU);

  const ensisijainenKieli = kielitiedot?.ensisijainenKieli;
  const toissijainenKieli = kielitiedot?.toissijainenKieli;
  const esikatselePdf = pdfFormRef.current?.esikatselePdf;

  return (
    <ProjektiPageLayout title="Aloituskuulutus">
      {voiMuokata && (
        <>
          <FormProvider {...useFormReturn}>
            <form>
              <fieldset style={{ display: "contents" }} disabled={disableFormEdit}>
                <Section>
                  {!isLoadingProjekti && (
                    <ProjektiErrorNotification projekti={projekti} validationSchema={loadedProjektiValidationSchema} />
                  )}
                  {projekti.aloitusKuulutus?.palautusSyy && (
                    <Notification type={NotificationType.WARN}>
                      {"Aloituskuulutus on palautettu korjattavaksi. Palautuksen syy: " + projekti.aloitusKuulutus.palautusSyy}
                    </Notification>
                  )}
                  {odottaaJulkaisua && (
                    <Notification type={NotificationType.WARN}>
                      {`Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä ${odottaaJulkaisua}`}.
                    </Notification>
                  )}
                  <Notification type={NotificationType.INFO} hideIcon>
                    <div>
                      <h3 className="vayla-small-title">Ohjeet</h3>
                      <ul className="list-disc block pl-5">
                        <li>Anna päivämäärä, jolloin suunnittelun aloittamisesta kuulutetaan tämän palvelun julkisella puolella.</li>
                        <li>
                          Kuvaa aloituskuulutuksessa esitettävään sisällönkuvauskenttään lyhyesti suunnittelukohteen alueellinen rajaus
                          (maantiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja toimenpiteet pääpiirteittäin karkealla
                          tasolla. Älä lisää tekstiin linkkejä.
                        </li>
                      </ul>
                    </div>
                  </Notification>
                  <HassuGrid cols={{ lg: 3 }}>
                    <HassuDatePickerWithController
                      label="Kuulutuspäivä"
                      minDate={today()}
                      onChange={(date) => {
                        if (date?.isValid()) {
                          getPaattymispaiva(date.format("YYYY-MM-DD"));
                        }
                      }}
                      textFieldProps={{ required: true }}
                      controllerProps={{
                        name: "aloitusKuulutus.kuulutusPaiva",
                      }}
                    />
                    <HassuDatePickerWithController
                      label="Kuulutusvaihe päättyy"
                      disabled={true}
                      controllerProps={{ name: "aloitusKuulutus.siirtyySuunnitteluVaiheeseen" }}
                    />
                  </HassuGrid>
                </Section>
                <Section noDivider={!!toissijainenKieli}>
                  <SectionContent>
                    <h5 className="vayla-small-title">Hankkeen sisällönkuvaus</h5>
                    <p>
                      Kirjoita aloituskuulutusta varten tiivistetty sisällönkuvaus hankkeesta. Kuvauksen on hyvä sisältää esimerkiksi tieto
                      suunnittelukohteen alueellista rajauksesta (maantiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja
                      toimenpiteet pääpiirteittäin karkealla tasolla. Älä lisää tekstiin linkkejä.{" "}
                    </p>
                  </SectionContent>
                  <Textarea
                    label={`Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä (${lowerCase(ensisijainenKieli)}) *`}
                    {...register(`aloitusKuulutus.hankkeenKuvaus.${ensisijainenKieli}`)}
                    error={(errors.aloitusKuulutus?.hankkeenKuvaus as any)?.[ensisijainenKieli]}
                    maxLength={maxAloituskuulutusLength}
                    disabled={disableFormEdit}
                  />
                </Section>
                {toissijainenKieli && (
                  <Section>
                    <Textarea
                      label={`Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (${lowerCase(toissijainenKieli)}) *`}
                      {...register(`aloitusKuulutus.hankkeenKuvaus.${toissijainenKieli}`)}
                      error={(errors.aloitusKuulutus?.hankkeenKuvaus as any)?.[toissijainenKieli]}
                      maxLength={maxAloituskuulutusLength}
                      disabled={disableFormEdit}
                    />
                  </Section>
                )}
                <KuulutuksenYhteystiedot projekti={projekti} />
                <IlmoituksenVastaanottajat isLoading={isLoadingProjekti} />
              </fieldset>
            </form>
          </FormProvider>
          <PdfPreviewForm ref={pdfFormRef} />
          {esikatselePdf && (
            <Section>
              <Notification type={NotificationType.INFO_GRAY}>
                Esikatsele kuulutus ja ilmoitus ennen hyväksyntään lähettämistä.
              </Notification>
              <p>Esitettävät tiedot ensisijaisella kielellä ({lowerCase(ensisijainenKieli || Kieli.SUOMI)})</p>
              <HassuStack direction={["column", "column", "row"]}>
                <Button
                  id={"preview_kuulutus_pdf_" + ensisijainenKieli}
                  type="submit"
                  onClick={handleSubmit((formData) => esikatselePdf(formData, AsiakirjaTyyppi.ALOITUSKUULUTUS, ensisijainenKieli))}
                  disabled={disableFormEdit}
                >
                  Kuulutuksen esikatselu
                </Button>
                <Button
                  id={"preview_ilmoitus_pdf_" + ensisijainenKieli}
                  type="submit"
                  onClick={handleSubmit((formData) => esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, ensisijainenKieli))}
                  disabled={disableFormEdit}
                >
                  Ilmoituksen esikatselu
                </Button>
              </HassuStack>
              {toissijainenKieli && (
                <>
                  <p>Esitettävät tiedot toissijaisella kielellä ({lowerCase(toissijainenKieli || Kieli.RUOTSI)})</p>
                  <HassuStack direction={["column", "column", "row"]}>
                    <Button
                      id={"preview_kuulutus_pdf_" + toissijainenKieli}
                      type="submit"
                      onClick={handleSubmit((formData) => esikatselePdf(formData, AsiakirjaTyyppi.ALOITUSKUULUTUS, toissijainenKieli))}
                      disabled={disableFormEdit}
                    >
                      Kuulutuksen esikatselu
                    </Button>
                    <Button
                      id={"preview_ilmoitus_pdf_" + toissijainenKieli}
                      type="submit"
                      onClick={handleSubmit((formData) =>
                        esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, toissijainenKieli)
                      )}
                      disabled={disableFormEdit}
                    >
                      Ilmoituksen esikatselu
                    </Button>
                  </HassuStack>
                </>
              )}
            </Section>
          )}
          <Section noDivider>
            <Stack justifyContent={[undefined, undefined, "flex-end"]} direction={["column", "column", "row"]}>
              <Button onClick={handleSubmit(saveDraft)} disabled={disableFormEdit}>
                Tallenna tiedot
              </Button>
              <Button id="save_and_send_for_acceptance" primary onClick={handleSubmit(lahetaHyvaksyttavaksi)}>
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
          />
        </FormProvider>
      )}

      {voiHyvaksya && (
        <>
          <Section noDivider>
            <Stack direction={["column", "column", "row"]} justifyContent={[undefined, undefined, "flex-end"]}>
              <Button id="button_reject" onClick={handleClickOpen}>
                Palauta
              </Button>
              <Button id="button_open_acceptance_dialog" primary onClick={handleClickOpenHyvaksy}>
                Hyväksy ja lähetä
              </Button>
            </Stack>
          </Section>
          <div>
            <HassuDialog open={open} title="Kuulutuksen palauttaminen" onClose={handleClickClose}>
              <form>
                <HassuStack>
                  <p>
                    Olet palauttamassa kuulutuksen korjattavaksi. Kuulutuksen tekijä saa tiedon palautuksesta ja sen syystä. Saat
                    ilmoituksen, kun kuulutus on taas valmis hyväksyttäväksi. Jos haluat itse muokata kuulutusta ja hyväksyä tehtyjen
                    muutoksien jälkeen, valitse Palauta ja muokkaa.
                  </p>
                  <Textarea
                    label="Syy palautukselle *"
                    {...register2("syy", { required: "Palautuksen syy täytyy antaa" })}
                    error={errors2.syy}
                    maxLength={200}
                    hideLengthCounter={false}
                  ></Textarea>
                </HassuStack>
                <HassuStack direction={["column", "column", "row"]} justifyContent={[undefined, undefined, "flex-end"]} paddingTop={"1rem"}>
                  <Button primary onClick={handleSubmit2(palautaMuokattavaksiJaPoistu)}>
                    Palauta ja poistu
                  </Button>
                  <Button id="reject_and_edit" onClick={handleSubmit2(palautaMuokattavaksi)}>
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
                </HassuStack>
              </form>
            </HassuDialog>
          </div>
          <div>
            <HassuDialog
              title="Kuulutuksen hyväksyminen ja ilmoituksen lähettäminen"
              hideCloseButton
              open={openHyvaksy}
              onClose={handleClickCloseHyvaksy}
            >
              <form style={{ display: "contents" }}>
                <DialogContent>
                  <p>
                    Olet hyväksymässä kuulutuksen ja käynnistämässä siihen liittyvän ilmoituksen automaattisen lähettämisen. Ilmoitus
                    kuulutuksesta lähetetään seuraaville:
                  </p>
                  <div>
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
                  <p>
                    Jos aloituskuulutukseen pitää tehdä muutoksia hyväksymisen jälkeen, tulee aloituskuulutus avata uudelleen ja lähettää
                    päivitetyt ilmoitukset asianosaisille. Kuulutuspäivän jälkeen tulevat muutostarpeet vaativat aloituksen uudelleen
                    kuuluttamisen.
                  </p>
                  <p>
                    Klikkaamalla Hyväksy ja lähetä -painiketta vahvistat kuulutuksen tarkastetuksi ja hyväksyt sen julkaisun kuulutuspäivänä
                    sekä ilmoituksien lähettämisen. Ilmoitukset lähetetään automaattisesti painikkeen klikkaamisen jälkeen.
                  </p>
                </DialogContent>
                <DialogActions>
                  <Button id="accept_kuulutus" primary onClick={handleSubmit(hyvaksyKuulutus)}>
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
                </DialogActions>
              </form>
            </HassuDialog>
          </div>
        </>
      )}
      {migroitu && (
        <Section noDivider>
          <>
            <p>Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.</p>
          </>
        </Section>
      )}
      <HassuSpinner open={isFormSubmitting || isLoadingProjekti} />
    </ProjektiPageLayout>
  );
}
