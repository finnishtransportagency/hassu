import Textarea from "@components/form/Textarea";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { useRouter } from "next/router";
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { useProjekti } from "src/hooks/useProjekti";
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
  Projekti,
  Status,
  TallennaProjektiInput,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  AsiakirjaTyyppi,
} from "@services/api";
import log from "loglevel";
import { PageProps } from "@pages/_app";
import DatePicker from "@components/form/DatePicker";
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
import { removeTypeName } from "src/util/removeTypeName";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";

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

export default function Aloituskuulutus({ setRouteLabels }: PageProps): ReactElement {
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const router = useRouter();
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti();
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
  const [formContext, setFormContext] = useState<Projekti | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [openHyvaksy, setOpenHyvaksy] = useState(false);
  const { t } = useTranslation("commonFI");

  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);

  useProjektiBreadcrumbs(setRouteLabels);

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
            projekti?.aloitusKuulutus?.esitettavatYhteystiedot
              ?.filter((yt) => yt)
              .map((yhteystieto) => {
                const { __typename, ...yhteystietoInput } = yhteystieto;
                return yhteystietoInput;
              }) || [],
        },
      };

      setFormContext(projekti);
      reset(tallentamisTiedot);
    }
  }, [projekti, reset]);

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
      deleteFieldArrayIds(formData?.aloitusKuulutus?.esitettavatYhteystiedot);
      deleteFieldArrayIds(formData?.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat);
      deleteFieldArrayIds(formData?.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset);
      setIsFormSubmitting(true);
      await api.tallennaProjekti(formData);
      await reloadProjekti();
    },
    [setIsFormSubmitting, reloadProjekti]
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
    [setIsFormSubmitting, saveAloituskuulutus, showSuccessMessage, showErrorMessage]
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
      log.debug("tallenna tiedot ja l??het?? hyv??ksytt??v??ksi");
      setIsFormSubmitting(true);
      try {
        await saveAloituskuulutus(formData);
        await vaihdaAloituskuulutuksenTila(TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI, "L??hetys");
      } catch (error) {
        log.error("Virhe hyv??ksynt????n l??hetyksess??", error);
        showErrorMessage("Hyv??ksynt????n l??hetyksess?? tapahtui virhe");
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
    log.debug("hyv??ksy kuulutus");
    await vaihdaAloituskuulutuksenTila(TilasiirtymaToiminto.HYVAKSY, "Hyv??ksyminen");
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
        showErrorMessage("Kuulutuksen p????ttymisp??iv??n laskennassa tapahtui virhe");
        log.error("P????ttymisp??iv??n laskennassa virhe", error);
      }
    },
    [setValue, showErrorMessage]
  );

  const kielitiedot: Kielitiedot | null | undefined = projekti?.kielitiedot;
  const voiMuokata = !projekti?.aloitusKuulutusJulkaisut || projekti.aloitusKuulutusJulkaisut.length < 1;
  const voiHyvaksya =
    getAloituskuulutusjulkaisuByTila(AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA) &&
    projekti?.nykyinenKayttaja.onProjektipaallikko;

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
                  <ProjektiErrorNotification
                    projekti={projekti}
                    validationSchema={loadedProjektiValidationSchema}
                    disableValidation={isLoadingProjekti}
                  />
                  {projekti.aloitusKuulutus?.palautusSyy && (
                    <Notification type={NotificationType.WARN}>
                      {"Aloituskuulutus on palautettu korjattavaksi. Palautuksen syy: " +
                        projekti.aloitusKuulutus.palautusSyy}
                    </Notification>
                  )}
                  {odottaaJulkaisua && (
                    <Notification type={NotificationType.WARN}>
                      {`Kuulutusta ei ole viel?? julkaistu. Kuulutusp??iv?? ${odottaaJulkaisua}`}.
                    </Notification>
                  )}
                  <Notification type={NotificationType.INFO} hideIcon>
                    <div>
                      <h3 className="vayla-small-title">Ohjeet</h3>
                      <ul className="list-disc block pl-5">
                        <li>
                          Anna p??iv??m????r??, jolloin suunnittelun aloittamisesta kuulutetaan t??m??n palvelun julkisella
                          puolella.
                        </li>
                        <li>
                          Kuvaa aloituskuulutuksessa esitett??v????n sis??ll??nkuvauskentt????n lyhyesti suunnittelukohteen
                          alueellinen rajaus (maantiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja
                          toimenpiteet p????piirteitt??in karkealla tasolla. ??l?? lis???? tekstiin linkkej??.
                        </li>
                      </ul>
                    </div>
                  </Notification>
                  <HassuGrid cols={{ lg: 3 }}>
                    <DatePicker
                      label="Kuulutusp??iv?? *"
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
                      label="Kuulutusvaihe p????ttyy"
                      readOnly
                      {...register("aloitusKuulutus.siirtyySuunnitteluVaiheeseen")}
                    />
                  </HassuGrid>
                </Section>
                <Section noDivider={!!toissijainenKieli}>
                  <SectionContent>
                    <h5 className="vayla-small-title">Hankkeen sis??ll??nkuvaus</h5>
                    <p>
                      Kirjoita aloituskuulutusta varten tiivistetty sis??ll??nkuvaus hankkeesta. Kuvauksen on hyv??
                      sis??lt???? esimerkiksi tieto suunnittelukohteen alueellista rajauksesta (maantiealue ja
                      vaikutusalue), suunnittelun tavoitteet, vaikutukset ja toimenpiteet p????piirteitt??in karkealla
                      tasolla. ??l?? lis???? tekstiin linkkej??.{" "}
                    </p>
                  </SectionContent>
                  <Textarea
                    label={`Tiivistetty hankkeen sis??ll??nkuvaus ensisijaisella kielell?? (${lowerCase(
                      ensisijainenKieli
                    )}) *`}
                    {...register(`aloitusKuulutus.hankkeenKuvaus.${ensisijainenKieli}`)}
                    error={(errors.aloitusKuulutus?.hankkeenKuvaus as any)?.[ensisijainenKieli]}
                    maxLength={maxAloituskuulutusLength}
                    disabled={disableFormEdit}
                  />
                </Section>
                {toissijainenKieli && (
                  <Section>
                    <Textarea
                      label={`Tiivistetty hankkeen sis??ll??nkuvaus toissijaisella kielell?? (${lowerCase(
                        toissijainenKieli
                      )}) *`}
                      {...register(`aloitusKuulutus.hankkeenKuvaus.${toissijainenKieli}`)}
                      error={(errors.aloitusKuulutus?.hankkeenKuvaus as any)?.[toissijainenKieli]}
                      maxLength={maxAloituskuulutusLength}
                      disabled={disableFormEdit}
                    />
                  </Section>
                )}
                <KuulutuksenYhteystiedot projekti={projekti} useFormReturn={useFormReturn} />
                <IlmoituksenVastaanottajat isLoading={isLoadingProjekti} />
              </fieldset>
            </form>
          </FormProvider>
          <PdfPreviewForm ref={pdfFormRef} />
          {esikatselePdf && (
            <Section>
              <Notification type={NotificationType.INFO_GRAY}>
                Esikatsele kuulutus ja ilmoitus ennen hyv??ksynt????n l??hett??mist??.
              </Notification>
              <p>Esitett??v??t tiedot ensisijaisella kielell?? ({lowerCase(ensisijainenKieli || Kieli.SUOMI)})</p>
              <HassuStack direction={["column", "column", "row"]}>
                <Button
                  id={"preview_kuulutus_pdf_" + ensisijainenKieli}
                  type="submit"
                  onClick={handleSubmit((formData) =>
                    esikatselePdf(formData, AsiakirjaTyyppi.ALOITUSKUULUTUS, ensisijainenKieli)
                  )}
                  disabled={disableFormEdit}
                >
                  Kuulutuksen esikatselu
                </Button>
                <Button
                  id={"preview_ilmoitus_pdf_" + ensisijainenKieli}
                  type="submit"
                  onClick={handleSubmit((formData) =>
                    esikatselePdf(formData, AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, ensisijainenKieli)
                  )}
                  disabled={disableFormEdit}
                >
                  Ilmoituksen esikatselu
                </Button>
              </HassuStack>
              {toissijainenKieli && (
                <>
                  <p>Esitett??v??t tiedot toissijaisella kielell?? ({lowerCase(toissijainenKieli || Kieli.RUOTSI)})</p>
                  <HassuStack direction={["column", "column", "row"]}>
                    <Button
                      id={"preview_kuulutus_pdf_" + toissijainenKieli}
                      type="submit"
                      onClick={handleSubmit((formData) =>
                        esikatselePdf(formData, AsiakirjaTyyppi.ALOITUSKUULUTUS, toissijainenKieli)
                      )}
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
                Tallenna ja l??het?? Hyv??ksytt??v??ksi
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
          ></AloituskuulutusLukunakyma>
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
                Hyv??ksy ja l??het??
              </Button>
            </Stack>
          </Section>
          <div>
            <HassuDialog open={open} title="Kuulutuksen palauttaminen" onClose={handleClickClose}>
              <form>
                <HassuStack>
                  <p>
                    Olet palauttamassa kuulutuksen korjattavaksi. Kuulutuksen tekij?? saa tiedon palautuksesta ja sen
                    syyst??. Saat ilmoituksen, kun kuulutus on taas valmis hyv??ksytt??v??ksi. Jos haluat itse muokata
                    kuulutusta ja hyv??ksy?? tehtyjen muutoksien j??lkeen, valitse Palauta ja muokkaa.
                  </p>
                  <Textarea
                    label="Syy palautukselle *"
                    {...register2("syy", { required: "Palautuksen syy t??ytyy antaa" })}
                    error={errors2.syy}
                    maxLength={200}
                    hideLengthCounter={false}
                  ></Textarea>
                </HassuStack>
                <HassuStack
                  direction={["column", "column", "row"]}
                  justifyContent={[undefined, undefined, "flex-end"]}
                  paddingTop={"1rem"}
                >
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
              title="Kuulutuksen hyv??ksyminen ja ilmoituksen l??hett??minen"
              hideCloseButton
              open={openHyvaksy}
              onClose={handleClickCloseHyvaksy}
            >
              <form style={{ display: "contents" }}>
                <DialogContent>
                  <p>
                    Olet hyv??ksym??ss?? kuulutuksen ja k??ynnist??m??ss?? siihen liittyv??n ilmoituksen automaattisen
                    l??hett??misen. Ilmoitus kuulutuksesta l??hetet????n seuraaville:
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
                    Jos aloituskuulutukseen pit???? tehd?? muutoksia hyv??ksymisen j??lkeen, tulee aloituskuulutus avata
                    uudelleen ja l??hett???? p??ivitetyt ilmoitukset asianosaisille. Kuulutusp??iv??n j??lkeen tulevat
                    muutostarpeet vaativat aloituksen uudelleen kuuluttamisen.
                  </p>
                  <p>
                    Klikkaamalla Hyv??ksy ja l??het?? -painiketta vahvistat kuulutuksen tarkastetuksi ja hyv??ksyt sen
                    julkaisun kuulutusp??iv??n?? sek?? ilmoituksien l??hett??misen. Ilmoitukset l??hetet????n automaattisesti
                    painikkeen klikkaamisen j??lkeen.
                  </p>
                </DialogContent>
                <DialogActions>
                  <Button id="accept_kuulutus" primary onClick={handleSubmit(hyvaksyKuulutus)}>
                    Hyv??ksy ja l??het??
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
            <p>T??m?? projekti on tuotu toisesta j??rjestelm??st??, joten kaikki toiminnot eiv??t ole mahdollisia.</p>
          </>
        </Section>
      )}
      <HassuSpinner open={isFormSubmitting || isLoadingProjekti} />
    </ProjektiPageLayout>
  );
}
