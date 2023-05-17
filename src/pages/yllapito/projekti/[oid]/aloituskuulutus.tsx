import Textarea from "@components/form/Textarea";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { useRouter } from "next/router";
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { FieldPath, FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Button from "@components/button/Button";
import Notification, { NotificationType } from "@components/notification/Notification";
import {
  AloitusKuulutusInput,
  AsiakirjaTyyppi,
  Kieli,
  Kielitiedot,
  KuulutusJulkaisuTila,
  LaskuriTyyppi,
  MuokkausTila,
  Status,
  TallennaProjektiInput,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
} from "@services/api";
import log from "loglevel";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import KuulutuksenYhteystiedot from "@components/projekti/aloituskuulutus/KuulutuksenYhteystiedot";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
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
import HassuSpinner from "@components/HassuSpinner";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { today } from "common/util/dateUtils";
import { kuntametadata } from "../../../../../common/kuntametadata";
import UudelleenkuulutaButton from "@components/projekti/UudelleenkuulutaButton";
import { getDefaultValuesForLokalisoituText, getDefaultValuesForUudelleenKuulutus } from "src/util/getDefaultValuesForLokalisoituText";
import SelitteetUudelleenkuulutukselle from "@components/projekti/SelitteetUudelleenkuulutukselle";
import useApi from "src/hooks/useApi";
import defaultEsitettavatYhteystiedot from "src/util/defaultEsitettavatYhteystiedot";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { isPohjoissaameSuunnitelma } from "../../../../util/isPohjoissaamiSuunnitelma";
import PohjoissaamenkielinenKuulutusJaIlmoitusInput from "@components/projekti/common/PohjoissaamenkielinenKuulutusJaIlmoitusInput";
import axios from "axios";
import { ValidationError } from "yup";

type ProjektiFields = Pick<TallennaProjektiInput, "oid" | "versio">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
  aloitusKuulutus: Pick<
    AloitusKuulutusInput,
    | "kuulutusYhteystiedot"
    | "kuulutusPaiva"
    | "hankkeenKuvaus"
    | "siirtyySuunnitteluVaiheeseen"
    | "ilmoituksenVastaanottajat"
    | "uudelleenKuulutus"
    | "aloituskuulutusSaamePDFt"
  >;
};

type PalautusValues = {
  syy: string;
};

const maxAloituskuulutusLength = 2000;

const loadedProjektiValidationSchema = getProjektiValidationSchema([
  ProjektiTestType.PROJEKTI_IS_LOADED,
  ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
  ProjektiTestType.PROJEKTI_HAS_ASIATUNNUS,
  ProjektiTestType.PROJEKTI_IS_CREATED,
]);

export default function AloituskuulutusPage(): ReactElement {
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti({ revalidateOnMount: true });
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
    const kuntaIds: number[] = [
      ...new Set([
        ...(projekti.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat?.map((kunta) => kunta.id) || []),
        ...(projekti.velho.kunnat || []),
      ]),
    ];

    const hankkeenKuvaus = getDefaultValuesForLokalisoituText(projekti.kielitiedot, projekti.aloitusKuulutus?.hankkeenKuvaus);

    const tallentamisTiedot: FormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      aloitusKuulutus: {
        ilmoituksenVastaanottajat: {
          kunnat: kuntaIds.map((id) => ({
            id,
            sahkoposti: projekti?.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat?.find((kunta) => kunta.id === id)?.sahkoposti || "",
          })),
          viranomaiset:
            projekti.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset?.map(({ nimi, sahkoposti }) => ({
              nimi,
              sahkoposti,
            })) || [],
        },
        hankkeenKuvaus,
        kuulutusPaiva: projekti?.aloitusKuulutus?.kuulutusPaiva || null,
        siirtyySuunnitteluVaiheeseen: projekti?.aloitusKuulutus?.siirtyySuunnitteluVaiheeseen || null,
        kuulutusYhteystiedot: defaultEsitettavatYhteystiedot(projekti.aloitusKuulutus?.kuulutusYhteystiedot),
      },
    };

    if (isPohjoissaameSuunnitelma(projekti.kielitiedot)) {
      const { kuulutusIlmoitusPDF, kuulutusPDF } = projekti.aloitusKuulutus?.aloituskuulutusSaamePDFt?.POHJOISSAAME || {};
      console.log(kuulutusIlmoitusPDF);
      console.log(kuulutusPDF);
      tallentamisTiedot.aloitusKuulutus.aloituskuulutusSaamePDFt = {
        POHJOISSAAME: {
          kuulutusIlmoitusPDFPath: kuulutusIlmoitusPDF?.tiedosto || null!,
          kuulutusPDFPath: kuulutusPDF?.tiedosto || null!,
        },
      };
    }

    if (projekti.aloitusKuulutus?.uudelleenKuulutus) {
      tallentamisTiedot.aloitusKuulutus.uudelleenKuulutus = getDefaultValuesForUudelleenKuulutus(
        projekti.kielitiedot,
        projekti.aloitusKuulutus.uudelleenKuulutus
      );
    }

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
  const { t, lang } = useTranslation("commonFI");

  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(aloituskuulutusSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    context: { projekti },
  };

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    trigger,
    setError,
    watch,
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const {
    register: register2,
    handleSubmit: handleSubmit2,
    formState: { errors: errors2 },
  } = useForm<PalautusValues>({ defaultValues: { syy: "" } });

  const api = useApi();

  const talletaTiedosto = useCallback(
    async (saameTiedosto: File) => {
      const contentType = (saameTiedosto as Blob).type || "application/octet-stream";
      const response = await api.valmisteleTiedostonLataus(saameTiedosto.name, contentType);
      await axios.put(response.latausLinkki, saameTiedosto, {
        headers: {
          "Content-Type": contentType,
        },
      });
      return response.tiedostoPolku;
    },
    [api]
  );

  const saveAloituskuulutus = useCallback(
    async (formData: FormValues) => {
      const pohjoisSaameIlmoitusPdf = formData.aloitusKuulutus.aloituskuulutusSaamePDFt?.POHJOISSAAME
        ?.kuulutusIlmoitusPDFPath as unknown as File | undefined | string;
      if (
        formData.aloitusKuulutus.aloituskuulutusSaamePDFt?.POHJOISSAAME?.kuulutusIlmoitusPDFPath &&
        pohjoisSaameIlmoitusPdf instanceof File
      ) {
        formData.aloitusKuulutus.aloituskuulutusSaamePDFt.POHJOISSAAME.kuulutusIlmoitusPDFPath = await talletaTiedosto(
          pohjoisSaameIlmoitusPdf
        );
      }
      const pohjoisSaameKuulutusPdf = formData.aloitusKuulutus.aloituskuulutusSaamePDFt?.POHJOISSAAME?.kuulutusPDFPath as unknown as
        | File
        | undefined
        | string;
      if (formData.aloitusKuulutus.aloituskuulutusSaamePDFt?.POHJOISSAAME?.kuulutusPDFPath && pohjoisSaameKuulutusPdf instanceof File) {
        formData.aloitusKuulutus.aloituskuulutusSaamePDFt.POHJOISSAAME.kuulutusPDFPath = await talletaTiedosto(pohjoisSaameKuulutusPdf);
      }

      deleteFieldArrayIds(formData?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot);
      deleteFieldArrayIds(formData?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysHenkilot);
      // kunta.id on oikea kunnan id-kenttä, joten se pitää lähettää deleteFieldArrayIds(formData?.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat);
      deleteFieldArrayIds(formData?.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset);
      setIsFormSubmitting(true);
      await api.tallennaProjekti(formData);
      await reloadProjekti();
    },
    [api, reloadProjekti, talletaTiedosto]
  );

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

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
      setOpenHyvaksy(false);
    },
    [projekti, api, reloadProjekti, showSuccessMessage, showErrorMessage]
  );

  const lahetaHyvaksyttavaksi = useCallback(
    async (formData: FormValues) => {
      try {
        await aloituskuulutusSchema.validate(formData, {
          context: { projekti, applyLahetaHyvaksyttavaksiChecks: true },
          abortEarly: false,
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          const errorArray = error.inner.length ? error.inner : [error];
          errorArray.forEach((err) => {
            const { type, path, message } = err;
            if (path) {
              setError(path as FieldPath<FormValues>, { type, message });
            }
          });
        }
        return;
      }

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
    [projekti, setError, saveAloituskuulutus, vaihdaAloituskuulutuksenTila, showErrorMessage]
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

  const handleClickOpenHyvaksy = async () => {
    const result = await trigger("aloitusKuulutus.kuulutusPaiva");

    if (result) {
      setOpenHyvaksy(true);
    } else {
      showErrorMessage("Kuulutuspäivämärä on menneisyydessä tai virheellinen. Palauta kuulutus muokattavaksi ja korjaa päivämäärä.");
    }
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
    [api, setValue, showErrorMessage]
  );

  const kielitiedot: Kielitiedot | null | undefined = projekti?.kielitiedot;
  const voiMuokata = !projekti?.aloitusKuulutus?.muokkausTila || projekti?.aloitusKuulutus?.muokkausTila === MuokkausTila.MUOKKAUS;
  const voiHyvaksya =
    projekti.aloitusKuulutusJulkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA && projekti?.nykyinenKayttaja.onProjektipaallikko;

  const odottaaJulkaisua = useMemo(() => {
    const julkaisu = projekti.aloitusKuulutusJulkaisu;
    if (julkaisu?.tila === KuulutusJulkaisuTila.HYVAKSYTTY) {
      // Toistaiseksi tarkastellaan julkaisupaivatietoa, koska ei ole olemassa erillista tilaa julkaistulle kuulutukselle
      const julkaisupvm = dayjs(julkaisu.kuulutusPaiva);
      if (dayjs().isBefore(julkaisupvm, "day")) {
        return julkaisupvm.format("DD.MM.YYYY");
      }
    }
    return null;
  }, [projekti.aloitusKuulutusJulkaisu]);

  if (!projekti || isLoadingProjekti) {
    return <></>;
  }
  if (!kielitiedot) {
    return <div>Kielitiedot puttuu</div>;
  }

  const migroitu = projekti?.aloitusKuulutus?.muokkausTila == MuokkausTila.MIGROITU;

  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  const esikatselePdf = pdfFormRef.current?.esikatselePdf;

  const showUudelleenkuulutaButton =
    projekti.aloitusKuulutusJulkaisu?.tila === KuulutusJulkaisuTila.HYVAKSYTTY &&
    projekti.aloitusKuulutus?.muokkausTila === MuokkausTila.LUKU &&
    projekti.status === Status.SUUNNITTELU &&
    projekti.nykyinenKayttaja.onYllapitaja;

  return (
    <ProjektiPageLayout
      title="Aloituskuulutus"
      contentAsideTitle={
        showUudelleenkuulutaButton && (
          <UudelleenkuulutaButton oid={projekti.oid} tyyppi={TilasiirtymaTyyppi.ALOITUSKUULUTUS} reloadProjekti={reloadProjekti} />
        )
      }
    >
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
                  <div className="flex flex-col flex-wrap md:flex-row gap-y-4 gap-x-7">
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
                      disabled
                      controllerProps={{ name: "aloitusKuulutus.siirtyySuunnitteluVaiheeseen" }}
                    />
                  </div>
                </Section>
                <SelitteetUudelleenkuulutukselle
                  disabled={disableFormEdit}
                  kielitiedot={projekti.kielitiedot}
                  uudelleenKuulutus={projekti.aloitusKuulutus?.uudelleenKuulutus}
                  vaiheenAvain="aloitusKuulutus"
                />
                <Section noDivider={!!toissijainenKaannettavaKieli}>
                  <SectionContent>
                    <h5 className="vayla-small-title">Hankkeen sisällönkuvaus</h5>
                    <p>
                      Kirjoita aloituskuulutusta varten tiivistetty sisällönkuvaus hankkeesta. Kuvauksen on hyvä sisältää esimerkiksi tieto
                      suunnittelukohteen alueellista rajauksesta (maantiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja
                      toimenpiteet pääpiirteittäin karkealla tasolla. Älä lisää tekstiin linkkejä.{" "}
                    </p>
                  </SectionContent>
                  {ensisijainenKaannettavaKieli && (
                    <Textarea
                      label={`Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä (${lowerCase(ensisijainenKaannettavaKieli)}) *`}
                      {...register(`aloitusKuulutus.hankkeenKuvaus.${ensisijainenKaannettavaKieli}`)}
                      error={(errors.aloitusKuulutus?.hankkeenKuvaus as any)?.[ensisijainenKaannettavaKieli]}
                      maxLength={maxAloituskuulutusLength}
                      disabled={disableFormEdit}
                    />
                  )}
                </Section>
                {toissijainenKaannettavaKieli && (
                  <Section>
                    <Textarea
                      label={`Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (${lowerCase(toissijainenKaannettavaKieli)}) *`}
                      {...register(`aloitusKuulutus.hankkeenKuvaus.${toissijainenKaannettavaKieli}`)}
                      error={(errors.aloitusKuulutus?.hankkeenKuvaus as any)?.[toissijainenKaannettavaKieli]}
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
              {ensisijainenKaannettavaKieli && (
                <>
                  <p>Esitettävät tiedot ensisijaisella kielellä ({lowerCase(ensisijainenKaannettavaKieli || Kieli.SUOMI)})</p>
                  <HassuStack direction={["column", "column", "row"]}>
                    <Button
                      id={"preview_kuulutus_pdf_" + ensisijainenKaannettavaKieli}
                      type="submit"
                      onClick={handleSubmit((formData) =>
                        esikatselePdf(formData, AsiakirjaTyyppi.ALOITUSKUULUTUS, ensisijainenKaannettavaKieli)
                      )}
                      disabled={disableFormEdit}
                    >
                      Kuulutuksen esikatselu
                    </Button>
                    <Button
                      id={"preview_ilmoitus_pdf_" + ensisijainenKaannettavaKieli}
                      type="submit"
                      onClick={handleSubmit((formData) =>
                        esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, ensisijainenKaannettavaKieli)
                      )}
                      disabled={disableFormEdit}
                    >
                      Ilmoituksen esikatselu
                    </Button>
                  </HassuStack>
                </>
              )}

              {toissijainenKaannettavaKieli && (
                <>
                  <p>Esitettävät tiedot toissijaisella kielellä ({lowerCase(toissijainenKaannettavaKieli || Kieli.RUOTSI)})</p>
                  <HassuStack direction={["column", "column", "row"]}>
                    <Button
                      id={"preview_kuulutus_pdf_" + toissijainenKaannettavaKieli}
                      type="submit"
                      onClick={handleSubmit((formData) =>
                        esikatselePdf(formData, AsiakirjaTyyppi.ALOITUSKUULUTUS, toissijainenKaannettavaKieli)
                      )}
                      disabled={disableFormEdit}
                    >
                      Kuulutuksen esikatselu
                    </Button>
                    <Button
                      id={"preview_ilmoitus_pdf_" + toissijainenKaannettavaKieli}
                      type="submit"
                      onClick={handleSubmit((formData) =>
                        esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, toissijainenKaannettavaKieli)
                      )}
                      disabled={disableFormEdit}
                    >
                      Ilmoituksen esikatselu
                    </Button>
                  </HassuStack>
                </>
              )}
              <FormProvider {...useFormReturn}>
                <form>
                  {isPohjoissaameSuunnitelma(projekti.kielitiedot) && (
                    <PohjoissaamenkielinenKuulutusJaIlmoitusInput
                      saamePdfAvain="aloitusKuulutus.aloituskuulutusSaamePDFt"
                      ilmoitusTiedot={projekti.aloitusKuulutus?.aloituskuulutusSaamePDFt?.POHJOISSAAME?.kuulutusIlmoitusPDF}
                      kuulutusTiedot={projekti.aloitusKuulutus?.aloituskuulutusSaamePDFt?.POHJOISSAAME?.kuulutusPDF}
                    />
                  )}
                </form>
              </FormProvider>
            </Section>
          )}

          <Section noDivider>
            <Stack justifyContent={[undefined, undefined, "flex-end"]} direction={["column", "column", "row"]}>
              <Button onClick={handleSubmit(saveDraft)} disabled={disableFormEdit}>
                Tallenna tiedot
              </Button>
              <Button id="save_and_send_for_acceptance" type="button" primary onClick={handleSubmit(lahetaHyvaksyttavaksi)}>
                Tallenna ja lähetä Hyväksyttäväksi
              </Button>
            </Stack>
          </Section>
        </>
      )}
      {!voiMuokata && !migroitu && (
        <FormProvider {...useFormReturn}>
          <AloituskuulutusLukunakyma
            projekti={projekti}
            aloituskuulutusjulkaisu={projekti.aloitusKuulutusJulkaisu}
            isLoadingProjekti={isLoadingProjekti}
          />
        </FormProvider>
      )}
      {voiHyvaksya && !migroitu && (
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
                        <li key={kunta.id}>
                          {kuntametadata.nameForKuntaId(kunta.id, lang)}, {kunta.sahkoposti}
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
