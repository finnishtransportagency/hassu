import Textarea from "@components/form/Textarea";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
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
import Section from "@components/layout/Section2";
import ContentSpacer from "@components/layout/ContentSpacer";
import HassuStack from "@components/layout/HassuStack";
import HassuSpinner from "@components/HassuSpinner";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { today } from "hassu-common/util/dateUtils";
import UudelleenkuulutaButton from "@components/projekti/UudelleenkuulutaButton";
import { getDefaultValuesForLokalisoituText, getDefaultValuesForUudelleenKuulutus } from "src/util/getDefaultValuesForLokalisoituText";
import SelitteetUudelleenkuulutukselle from "@components/projekti/SelitteetUudelleenkuulutukselle";
import useApi from "src/hooks/useApi";
import defaultEsitettavatYhteystiedot from "src/util/defaultEsitettavatYhteystiedot";
import { getKaannettavatKielet } from "hassu-common/kaannettavatKielet";
import { isPohjoissaameSuunnitelma } from "../../../../util/isPohjoissaamiSuunnitelma";
import PohjoissaamenkielinenKuulutusJaIlmoitusInput from "@components/projekti/common/PohjoissaamenkielinenKuulutusJaIlmoitusInput";
import { ValidationError } from "yup";
import { lataaTiedosto } from "../../../../util/fileUtil";
import KuulutuksenPalauttaminenDialog from "@components/projekti/KuulutuksenPalauttaminenDialog";
import KuulutuksenHyvaksyminenDialog from "@components/projekti/KuulutuksenHyvaksyminenDialog";
import { Stack } from "@mui/system";

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
  const [isShowPalautaDialog, setIsShowPalautaDialog] = useState(false);
  const [openHyvaksy, setOpenHyvaksy] = useState(false);

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

  const api = useApi();

  const talletaTiedosto = useCallback(async (tiedosto: File) => lataaTiedosto(api, tiedosto), [api]);

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
        showSuccessMessage("Luonnoksen tallennus onnistui");
      } catch (e) {
        log.error("OnSubmit Error", e);
      }
      setIsFormSubmitting(false);
    },
    [saveAloituskuulutus, showSuccessMessage]
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
      }
      setIsFormSubmitting(false);
      setIsShowPalautaDialog(false);
      setOpenHyvaksy(false);
    },
    [projekti, api, reloadProjekti, showSuccessMessage]
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
      }
      setIsFormSubmitting(false);
    },
    [projekti, setError, saveAloituskuulutus, vaihdaAloituskuulutuksenTila]
  );

  const openPalautaDialog = () => {
    setIsShowPalautaDialog(true);
  };

  const closePalautaDialog = useCallback(() => {
    setIsShowPalautaDialog(false);
  }, []);

  const handleClickOpenHyvaksy = async () => {
    const result = await trigger("aloitusKuulutus.kuulutusPaiva");

    if (result) {
      setOpenHyvaksy(true);
    } else {
      showErrorMessage("Kuulutuspäivämärä on menneisyydessä tai virheellinen. Palauta kuulutus muokattavaksi ja korjaa päivämäärä.");
    }
  };

  const handleClickCloseHyvaksy = useCallback(() => {
    setOpenHyvaksy(false);
  }, []);

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
    projekti.aloitusKuulutusJulkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA &&
    projekti?.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo;

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
    ((projekti.status === Status.SUUNNITTELU && !projekti.vahainenMenettely) ||
      (projekti.status === Status.NAHTAVILLAOLO_AINEISTOT && projekti.vahainenMenettely)) &&
    projekti.nykyinenKayttaja.onYllapitaja;

  const kunnat = watch("aloitusKuulutus.ilmoituksenVastaanottajat.kunnat");
  const puuttuuKunnat = !(kunnat && kunnat.length > 0);

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
                  {puuttuuKunnat && (
                    <Notification type={NotificationType.ERROR}>
                      Projektilta puuttuu kunnat! Katso, että projektin kunnat on asetettu Projektivelhossa, ja päivitä ne Projektin tiedot
                      -sivulla painamalla &quot;Päivitä tiedot&quot;.
                    </Notification>
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
                        <li>
                          Anna päivämäärä, jolloin suunnittelun aloittamisesta kuulutetaan. Projekti ja sen aloituskuulutus julkaistaan
                          samana päivänä Valtion liikenneväylien suunnittelu -palvelun kansalaispuolella.
                        </li>
                        <li>Valitse / syötä kuulutuksessa esitettävät yhteystiedot.</li>
                        <li>
                          Kirjoita aloituskuulutuksessa esitettävään sisällönkuvauskenttään lyhyesti suunnittelukohteen alueellinen rajaus
                          (maantiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja toimenpiteet pääpiirteittäin karkealla
                          tasolla. Älä lisää tekstiin linkkejä. Jos projektista tulee tehdä kuulutus ensisijaisen kielen lisäksi toisella
                          kielellä, eikä tälle ole kenttää, tarkista Projektin tiedot -sivulta projektin kieliasetus. Teksti tulee näkyviin
                          aloituskuulutukseen.
                        </li>
                        <li>
                          Lähetä aloituskuulutus projektipäällikölle hyväksyttäväksi. Hyväksyntä on hyvä tehdä noin viikko ennen kuulutuksen
                          julkaisua, jotta kunnat saavat tiedon kuulutuksesta ajoissa.
                        </li>
                        <li>Voit hyödyntää lehti-ilmoituksen tilauksessa järjestelmässä luotua kuulutuksen luonnosta.</li>
                        <li>Projekti siirtyy kuulutuspäivästä lasketun määräajan jälkeen automaattisesti suunnitteluvaiheeseen.</li>
                        <li>Muistathan viedä kuulutuksen ja ilmoituksen kuulutuksesta asianhallintaan.</li>
                      </ul>
                    </div>
                  </Notification>
                  <ContentSpacer>
                    <h5 className="vayla-small-title">Kuulutus- ja julkaisupäivä</h5>
                    <p>Anna päivämäärä, jolle kuulutus päivätään ja julkaistaan palvelun julkisella puolella.</p>
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
                  </ContentSpacer>
                </Section>
                <SelitteetUudelleenkuulutukselle
                  disabled={disableFormEdit}
                  kielitiedot={projekti.kielitiedot}
                  uudelleenKuulutus={projekti.aloitusKuulutus?.uudelleenKuulutus}
                  vaiheenAvain="aloitusKuulutus"
                />
                <Section>
                  <ContentSpacer>
                    <h5 className="vayla-small-title">Hankkeen sisällönkuvaus</h5>
                    <p>
                      Kirjoita tiivistetty sisällönkuvaus hankkeesta. Kuvauksen on hyvä sisältää esimerkiksi tieto suunnittelukohteen
                      alueellista rajauksesta (maantie- /rautatiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja toimenpiteet
                      pääpiirteittäin karkealla tasolla. Älä lisää tekstiin linkkejä.
                    </p>
                    {ensisijainenKaannettavaKieli && (
                      <Textarea
                        label={`Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä (${lowerCase(ensisijainenKaannettavaKieli)}) *`}
                        {...register(`aloitusKuulutus.hankkeenKuvaus.${ensisijainenKaannettavaKieli}`)}
                        error={(errors.aloitusKuulutus?.hankkeenKuvaus as any)?.[ensisijainenKaannettavaKieli]}
                        maxLength={maxAloituskuulutusLength}
                        disabled={disableFormEdit}
                      />
                    )}
                    {toissijainenKaannettavaKieli && (
                      <Textarea
                        label={`Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (${lowerCase(toissijainenKaannettavaKieli)}) *`}
                        {...register(`aloitusKuulutus.hankkeenKuvaus.${toissijainenKaannettavaKieli}`)}
                        error={(errors.aloitusKuulutus?.hankkeenKuvaus as any)?.[toissijainenKaannettavaKieli]}
                        maxLength={maxAloituskuulutusLength}
                        disabled={disableFormEdit}
                      />
                    )}
                  </ContentSpacer>
                </Section>
                <KuulutuksenYhteystiedot projekti={projekti} />
                <IlmoituksenVastaanottajat isLoading={isLoadingProjekti} />
              </fieldset>
            </form>
          </FormProvider>
          <PdfPreviewForm ref={pdfFormRef} />
          {esikatselePdf && (
            <Section>
              <h5 className="vayla-small-title">Kuulutuksen ja ilmoituksen esikatselu</h5>
              <Notification type={NotificationType.INFO_GRAY}>
                Esikatsele kuulutus ja ilmoitus ennen hyväksyntään lähettämistä.
              </Notification>
              {ensisijainenKaannettavaKieli && (
                <>
                  <p>Esitettävät tiedostot ensisijaisella kielellä ({lowerCase(ensisijainenKaannettavaKieli || Kieli.SUOMI)})</p>
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
                  <p>Esitettävät tiedostot toissijaisella kielellä ({lowerCase(toissijainenKaannettavaKieli || Kieli.RUOTSI)})</p>
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
                Tallenna luonnos
              </Button>
              <Button
                disabled={puuttuuKunnat}
                id="save_and_send_for_acceptance"
                type="button"
                primary
                onClick={handleSubmit(lahetaHyvaksyttavaksi)}
              >
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
              <Button id="button_reject" onClick={openPalautaDialog}>
                Palauta
              </Button>
              <Button id="button_open_acceptance_dialog" primary onClick={handleClickOpenHyvaksy}>
                Hyväksy ja lähetä
              </Button>
            </Stack>
          </Section>
          <KuulutuksenPalauttaminenDialog
            open={isShowPalautaDialog}
            onClose={closePalautaDialog}
            projekti={projekti}
            setIsFormSubmitting={setIsFormSubmitting}
            tilasiirtymaTyyppi={TilasiirtymaTyyppi.ALOITUSKUULUTUS}
          />
          <KuulutuksenHyvaksyminenDialog
            onClose={handleClickCloseHyvaksy}
            open={openHyvaksy}
            projekti={projekti}
            setIsFormSubmitting={setIsFormSubmitting}
            tilasiirtymaTyyppi={TilasiirtymaTyyppi.ALOITUSKUULUTUS}
          />
        </>
      )}
      {migroitu && (
        <Section noDivider>
          <>
            <p>
              Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten
              kuulutuksen tietoja ei ole saatavilla palvelusta.
            </p>
          </>
        </Section>
      )}
      <HassuSpinner open={isFormSubmitting || isLoadingProjekti} />
    </ProjektiPageLayout>
  );
}
