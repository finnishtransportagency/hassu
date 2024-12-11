import Textarea from "@components/form/Textarea";
import ProjektiPageLayout, { ProjektiPageLayoutContext } from "@components/projekti/ProjektiPageLayout";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import React, { ReactElement, useCallback, useEffect, useMemo } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Button from "@components/button/Button";
import Notification, { NotificationType } from "@components/notification/Notification";
import {
  AloitusKuulutusInput,
  AsiakirjaTyyppi,
  Kielitiedot,
  KirjaamoOsoite,
  KuulutusJulkaisuTila,
  LaskuriTyyppi,
  MuokkausTila,
  Status,
  TallennaProjektiInput,
  TilasiirtymaTyyppi,
  Vaihe,
} from "@services/api";
import log from "loglevel";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";
import KuulutuksenYhteystiedot from "@components/projekti/aloituskuulutus/KuulutuksenYhteystiedot";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import useSnackbars from "src/hooks/useSnackbars";
import { aloituskuulutusSchema } from "src/schemas/aloituskuulutus";
import AloituskuulutusLukunakyma from "@components/projekti/aloituskuulutus/AloituskuulutusLukunakyma";
import IlmoituksenVastaanottajat from "@components/projekti/aloituskuulutus/IlmoituksenVastaanottajat";
import dayjs from "dayjs";
import Section from "@components/layout/Section2";
import ContentSpacer from "@components/layout/ContentSpacer";
import HassuStack from "@components/layout/HassuStack";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { today } from "hassu-common/util/dateUtils";
import UudelleenkuulutaButton from "@components/projekti/UudelleenkuulutaButton";
import { getDefaultValuesForLokalisoituText } from "src/util/getDefaultValuesForLokalisoituText";
import { getDefaultValuesForUudelleenKuulutus } from "src/util/getDefaultValuesForUudelleenKuulutus";
import SelitteetUudelleenkuulutukselle from "@components/projekti/SelitteetUudelleenkuulutukselle";
import useApi from "src/hooks/useApi";
import defaultEsitettavatYhteystiedot from "src/util/defaultEsitettavatYhteystiedot";
import { getKaannettavatKielet } from "hassu-common/kaannettavatKielet";
import { isPohjoissaameSuunnitelma } from "../../../../util/isPohjoissaamiSuunnitelma";
import PohjoissaamenkielinenKuulutusJaIlmoitusInput from "@components/projekti/common/PohjoissaamenkielinenKuulutusJaIlmoitusInput";
import { lataaTiedosto } from "../../../../util/fileUtil";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import HyvaksyJaPalautaPainikkeet from "@components/projekti/HyvaksyJaPalautaPainikkeet";
import { useHandleSubmit } from "src/hooks/useHandleSubmit";
import useValidationMode from "src/hooks/useValidationMode";
import TallennaLuonnosJaVieHyvaksyttavaksiPainikkeet from "@components/projekti/TallennaLuonnosJaVieHyvaksyttavaksiPainikkeet";
import { label } from "src/util/textUtil";
import { OhjelistaNotification } from "@components/projekti/common/OhjelistaNotification";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import { H2, H3 } from "../../../../components/Headings";

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
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();

  return (
    <>
      {projekti && kirjaamoOsoitteet && (
        <AloituskuulutusForm
          projekti={projekti}
          projektiLoadError={projektiLoadError}
          reloadProjekti={reloadProjekti}
          kirjaamoOsoitteet={kirjaamoOsoitteet}
        />
      )}
    </>
  );
}

interface AloituskuulutusFormProps {
  projekti: ProjektiLisatiedolla;
  projektiLoadError: any;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
  kirjaamoOsoitteet: KirjaamoOsoite[];
}

function AloituskuulutusForm({ projekti, projektiLoadError, reloadProjekti, kirjaamoOsoitteet }: AloituskuulutusFormProps): ReactElement {
  const { isLoading: isFormSubmitting } = useLoadingSpinner();

  const validationMode = useValidationMode();

  const isLoadingProjekti = !projekti && !projektiLoadError;
  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const isIncorrectProjektiStatus = !projekti?.status || projekti?.status === Status.EI_JULKAISTU;
  const defaultValues: FormValues = useMemo(() => {
    const hankkeenKuvaus = getDefaultValuesForLokalisoituText(projekti.kielitiedot, projekti.aloitusKuulutus?.hankkeenKuvaus);
    const tallentamisTiedot: FormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      aloitusKuulutus: {
        ilmoituksenVastaanottajat: defaultVastaanottajat(projekti, projekti.aloitusKuulutus?.ilmoituksenVastaanottajat, kirjaamoOsoitteet),
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
          kuulutusIlmoitusPDFPath: kuulutusIlmoitusPDF?.tiedosto || null,
          kuulutusPDFPath: kuulutusPDF?.tiedosto || null,
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
  }, [projekti, kirjaamoOsoitteet]);

  const disableFormEdit =
    !projekti?.nykyinenKayttaja.omaaMuokkausOikeuden ||
    projektiHasErrors ||
    isLoadingProjekti ||
    isFormSubmitting ||
    isIncorrectProjektiStatus;

  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);

  const formOptions: UseFormProps<FormValues, ProjektiValidationContext> = {
    resolver: yupResolver(aloituskuulutusSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    context: { projekti, validationMode },
  };

  const useFormReturn = useForm<FormValues, ProjektiValidationContext>(formOptions);
  const {
    register,
    formState: { errors, isDirty, isSubmitting },
    reset,
    setValue,
    watch,
  } = useFormReturn;

  useLeaveConfirm(!isSubmitting && isDirty);

  const api = useApi();

  const talletaTiedosto = useCallback(async (tiedosto: File) => lataaTiedosto(api, tiedosto), [api]);

  const preSubmitFunction = useCallback(
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
      return formData;
    },
    [talletaTiedosto]
  );

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const { showErrorMessage } = useSnackbars();

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

  const { handleDraftSubmit } = useHandleSubmit(useFormReturn);

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
  return (
    <ProjektiPageLayout
      title="Aloituskuulutus"
      vaihe={Vaihe.ALOITUSKUULUTUS}
      showInfo={voiMuokata}
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

                  <ProjektiPageLayoutContext.Consumer>
                    {({ ohjeetOpen, ohjeetOnClose }) => (
                      <OhjelistaNotification
                        asianhallintaTiedot={{ vaihe: Vaihe.ALOITUSKUULUTUS, projekti }}
                        open={ohjeetOpen}
                        onClose={ohjeetOnClose}
                      >
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
                        {projekti.asianhallinta.inaktiivinen && (
                          <li>Muistathan viedä kuulutuksen sekä ilmoituksen kuulutuksesta asianhallintaan.</li>
                        )}
                        {!projekti.asianhallinta.inaktiivinen && (
                          <li>
                            Kuulutus sekä ilmoitus kuulutuksesta siirtyvät automaattisesti asianhallintaan kuulutuksen hyväksymisen
                            yhteydessä.
                          </li>
                        )}
                      </OhjelistaNotification>
                    )}
                  </ProjektiPageLayoutContext.Consumer>
                  <ContentSpacer>
                    <H2>Kuulutus- ja julkaisupäivä</H2>
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
                    <H3>Hankkeen sisällönkuvaus</H3>
                    <p>
                      Kirjoita tiivistetty sisällönkuvaus hankkeesta. Kuvauksen on hyvä sisältää esimerkiksi tieto suunnittelukohteen
                      alueellista rajauksesta (maantie- /rautatiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja toimenpiteet
                      pääpiirteittäin karkealla tasolla. Älä lisää tekstiin linkkejä.
                    </p>
                    {ensisijainenKaannettavaKieli && (
                      <Textarea
                        label={label({
                          label: "Tiivistetty hankkeen sisällönkuvaus",
                          inputLanguage: ensisijainenKaannettavaKieli,
                          kielitiedot,
                          required: true,
                        })}
                        {...register(`aloitusKuulutus.hankkeenKuvaus.${ensisijainenKaannettavaKieli}`)}
                        error={(errors.aloitusKuulutus?.hankkeenKuvaus as any)?.[ensisijainenKaannettavaKieli]}
                        maxLength={maxAloituskuulutusLength}
                        disabled={disableFormEdit}
                      />
                    )}
                    {toissijainenKaannettavaKieli && (
                      <Textarea
                        label={label({
                          label: "Tiivistetty hankkeen sisällönkuvaus",
                          inputLanguage: toissijainenKaannettavaKieli,
                          kielitiedot,
                          required: true,
                        })}
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
              <H3>Kuulutuksen ja ilmoituksen esikatselu</H3>
              <Notification type={NotificationType.INFO_GRAY}>
                Esikatsele kuulutus ja ilmoitus ennen hyväksyntään lähettämistä.
              </Notification>
              {ensisijainenKaannettavaKieli && (
                <>
                  <p>
                    {label({
                      label: "Esitettävät tiedostot",
                      inputLanguage: ensisijainenKaannettavaKieli,
                      kielitiedot,
                    })}
                  </p>
                  <HassuStack direction={["column", "column", "row"]}>
                    <Button
                      id={"preview_kuulutus_pdf_" + ensisijainenKaannettavaKieli}
                      type="submit"
                      onClick={handleDraftSubmit((formData) =>
                        esikatselePdf(formData, AsiakirjaTyyppi.ALOITUSKUULUTUS, ensisijainenKaannettavaKieli)
                      )}
                      disabled={disableFormEdit}
                    >
                      Kuulutuksen esikatselu
                    </Button>
                    <Button
                      id={"preview_ilmoitus_pdf_" + ensisijainenKaannettavaKieli}
                      type="submit"
                      onClick={handleDraftSubmit((formData) =>
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
                  <p>
                    {label({
                      label: "Esitettävät tiedostot",
                      inputLanguage: toissijainenKaannettavaKieli,
                      kielitiedot,
                    })}
                  </p>
                  <HassuStack direction={["column", "column", "row"]}>
                    <Button
                      id={"preview_kuulutus_pdf_" + toissijainenKaannettavaKieli}
                      type="submit"
                      onClick={handleDraftSubmit((formData) =>
                        esikatselePdf(formData, AsiakirjaTyyppi.ALOITUSKUULUTUS, toissijainenKaannettavaKieli)
                      )}
                      disabled={disableFormEdit}
                    >
                      Kuulutuksen esikatselu
                    </Button>
                    <Button
                      id={"preview_ilmoitus_pdf_" + toissijainenKaannettavaKieli}
                      type="submit"
                      onClick={handleDraftSubmit((formData) =>
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

          <FormProvider {...useFormReturn}>
            <TallennaLuonnosJaVieHyvaksyttavaksiPainikkeet
              kuntavastaanottajat={kunnat}
              preSubmitFunction={preSubmitFunction}
              projekti={projekti}
              tilasiirtymaTyyppi={TilasiirtymaTyyppi.ALOITUSKUULUTUS}
            />
          </FormProvider>
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
      {voiHyvaksya && !migroitu && projekti.aloitusKuulutusJulkaisu && (
        <HyvaksyJaPalautaPainikkeet
          julkaisu={projekti.aloitusKuulutusJulkaisu}
          projekti={projekti}
          tilasiirtymaTyyppi={TilasiirtymaTyyppi.ALOITUSKUULUTUS}
        />
      )}
      {migroitu && (
        <Section noDivider>
          <p>
            Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten
            kuulutuksen tietoja ei ole saatavilla palvelusta.
          </p>
        </Section>
      )}
    </ProjektiPageLayout>
  );
}
