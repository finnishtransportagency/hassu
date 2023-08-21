import { Controller, FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { suunnittelunPerustiedotSchema } from "src/schemas/suunnittelunPerustiedot";
import SectionContent from "@components/layout/SectionContent";
import {
  Kieli,
  Kielitiedot,
  LokalisoituLinkki,
  LokalisoituLinkkiInput,
  TallennaProjektiInput,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  VuorovaikutusKierrosInput,
  VuorovaikutusKierrosTila,
  VuorovaikutusPerustiedotInput,
  Yhteystieto,
} from "@services/api";
import Section from "@components/layout/Section";
import { Fragment, ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { DialogActions, DialogContent, Stack } from "@mui/material";
import Button from "@components/button/Button";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import HassuSpinner from "@components/HassuSpinner";
import HassuDialog from "@components/HassuDialog";
import SaapuneetKysymyksetJaPalautteet from "../SaapuneetKysymyksetJaPalautteet";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import useApi from "src/hooks/useApi";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { today } from "common/util/dateUtils";
import FormGroup from "@components/form/FormGroup";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import CheckBox from "@components/form/CheckBox";
import useProjektiHenkilot from "src/hooks/useProjektiHenkilot";
import SuunnittelunEteneminenJaArvioKestosta from "./SuunnittelunEteneminenJaArvioKestosta";
import EiJulkinenLuonnoksetJaAineistotLomake from "../LuonnoksetJaAineistot/EiJulkinen";
import router from "next/router";
import { getDefaultValuesForLokalisoituText } from "src/util/getDefaultValuesForLokalisoituText";
import { poistaTypeNameJaTurhatKielet } from "src/util/removeExtraLanguagesAndTypename";
import useTranslation from "next-translate/useTranslation";
import { getKaannettavatKielet, KaannettavaKieli } from "common/kaannettavatKielet";
import KierroksenPoistoDialogi from "../KierroksenPoistoDialogi";
import { handleAineistoArrayForDefaultValues } from "src/util/handleAineistoArrayForDefaultValues";
import { handleAineistoArraysForSave } from "src/util/handleAineistoArraysForSave";

type ProjektiFields = Pick<TallennaProjektiInput, "oid" | "versio">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

export type SuunnittelunPerustiedotFormValues = RequiredProjektiFields & {
  vuorovaikutusKierros: Pick<
    VuorovaikutusKierrosInput,
    | "hankkeenKuvaus"
    | "vuorovaikutusNumero"
    | "arvioSeuraavanVaiheenAlkamisesta"
    | "suunnittelunEteneminenJaKesto"
    | "esittelyaineistot"
    | "suunnitelmaluonnokset"
    | "videot"
    | "suunnittelumateriaali"
    | "kysymyksetJaPalautteetViimeistaan"
    | "palautteidenVastaanottajat"
  > & {
    poistetutEsittelyaineistot: VuorovaikutusKierrosInput["esittelyaineistot"];
    poistetutSuunnitelmaluonnokset: VuorovaikutusKierrosInput["suunnitelmaluonnokset"];
  };
};

export const defaultEmptyLokalisoituLink = (
  link: LokalisoituLinkkiInput | null | undefined,
  kielitiedot: Kielitiedot | null | undefined
): LokalisoituLinkkiInput => {
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  if (!link) {
    const lokalisoituLinkki: Partial<LokalisoituLinkkiInput> = {};
    lokalisoituLinkki[ensisijainenKaannettavaKieli || Kieli.SUOMI] = { url: "", nimi: "" };

    if (toissijainenKaannettavaKieli) {
      lokalisoituLinkki[toissijainenKaannettavaKieli] = { url: "", nimi: "" };
    }
    return lokalisoituLinkki as LokalisoituLinkkiInput;
  }
  const lokalisoituLinkki: Partial<LokalisoituLinkkiInput> = {};
  Object.keys(link).forEach((key) => {
    if (key !== "__typename") {
      lokalisoituLinkki[key as KaannettavaKieli] = {
        url: link[key as KaannettavaKieli]?.url || "",
        nimi: link[key as KaannettavaKieli]?.nimi || "",
      };
    }
  });
  return lokalisoituLinkki as LokalisoituLinkkiInput;
};

const defaultListWithEmptyLokalisoituLink = (
  list: LokalisoituLinkkiInput[] | null | undefined,
  kielitiedot: Kielitiedot | null | undefined
): LokalisoituLinkkiInput[] => {
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  if (!list || !list.length) {
    const lokalisoituLinkkiArray: LokalisoituLinkkiInput[] = [];
    const lokalisoituLinkki: Partial<LokalisoituLinkkiInput> = {};
    lokalisoituLinkki[ensisijainenKaannettavaKieli || Kieli.SUOMI] = { url: "", nimi: "" };
    if (toissijainenKaannettavaKieli) {
      lokalisoituLinkki[toissijainenKaannettavaKieli] = { url: "", nimi: "" };
    }
    lokalisoituLinkkiArray.push(lokalisoituLinkki as LokalisoituLinkki);
    return lokalisoituLinkkiArray;
  }
  return (list || []).map((link) => {
    const lokalisoituLinkki: Partial<LokalisoituLinkkiInput> = {};
    Object.keys(link).forEach((key) => {
      if (key !== "__typename") {
        lokalisoituLinkki[key as KaannettavaKieli] = {
          url: link[key as KaannettavaKieli]?.url || "",
          nimi: link[key as KaannettavaKieli]?.nimi || "",
        };
      }
    });
    return lokalisoituLinkki as LokalisoituLinkkiInput;
  });
};

export default function SuunnitteluvaiheenPerustiedot(): ReactElement {
  const { data: projekti, mutate: reloadProjekti } = useProjekti({ revalidateOnMount: true });
  return <>{projekti && <SuunnitteluvaiheenPerustiedotForm {...{ projekti, reloadProjekti }} />}</>;
}

type SuunnitteluvaiheenPerustiedotFormProps = {
  projekti: ProjektiLisatiedolla;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
};

function SuunnitteluvaiheenPerustiedotForm({ projekti, reloadProjekti }: SuunnitteluvaiheenPerustiedotFormProps): ReactElement {
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { showSuccessMessage } = useSnackbars();
  const [isOpenHyvaksy, setIsOpenHyvaksy] = useState(false);
  const [openPoistoDialogi, setOpenPoistoDialogi] = useState(false);

  const closeHyvaksy = useCallback(() => {
    setIsOpenHyvaksy(false);
  }, []);

  const api = useApi();

  const projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[] = useProjektiHenkilot(projekti);

  const defaultValues: SuunnittelunPerustiedotFormValues = useMemo(() => {
    const { lisatty: esittelyaineistot, poistettu: poistetutEsittelyaineistot } = handleAineistoArrayForDefaultValues(
      projekti.vuorovaikutusKierros?.esittelyaineistot,
      true
    );

    const { lisatty: suunnitelmaluonnokset, poistettu: poistetutSuunnitelmaluonnokset } = handleAineistoArrayForDefaultValues(
      projekti.vuorovaikutusKierros?.suunnitelmaluonnokset,
      true
    );

    const tallentamisTiedot: SuunnittelunPerustiedotFormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: projekti.vuorovaikutusKierros?.vuorovaikutusNumero || 1,
        hankkeenKuvaus: poistaTypeNameJaTurhatKielet(projekti.aloitusKuulutus?.hankkeenKuvaus, projekti.kielitiedot),
        arvioSeuraavanVaiheenAlkamisesta: getDefaultValuesForLokalisoituText(
          projekti.kielitiedot,
          projekti.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta
        ),
        suunnittelunEteneminenJaKesto: getDefaultValuesForLokalisoituText(
          projekti.kielitiedot,
          projekti.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto || {
            SUOMI:
              "Suunnitteluvaihe on oikea aika perehtyä ja vaikuttaa suunnitelmaratkaisuihin sekä " +
              "tuoda esiin suunnitelman viimeistelyyn mahdollisesti vaikuttavia tietoja paikallisista olosuhteista. " +
              "Suunnittelun aikaisessa vuorovaikutuksessa esitellään suunnitelman luonnoksia ja suunnitelmaratkaisuja. " +
              "Suunnitelmaluonnoksista on mahdollista antaa palautetta sekä esittää kysymyksiä. " +
              "\n\n" +
              "Luonnosten esittelyn jälkeen saadut palautteet ja kysymykset käydään läpi ja suunnitelma viimeistellään. " +
              "Tämän jälkeen valmis suunnitelma asetetaan nähtäville, jolloin asianosaisilla on mahdollisuus jättää suunnitelmasta virallinen muistutus.",
            RUOTSI: "",
          }
        ),
        esittelyaineistot,
        suunnitelmaluonnokset,
        poistetutEsittelyaineistot,
        poistetutSuunnitelmaluonnokset,
        videot: defaultListWithEmptyLokalisoituLink(projekti.vuorovaikutusKierros?.videot, projekti.kielitiedot),
        suunnittelumateriaali: projekti.vuorovaikutusKierros?.suunnittelumateriaali?.length
          ? projekti.vuorovaikutusKierros?.suunnittelumateriaali?.map((link) => defaultEmptyLokalisoituLink(link, projekti.kielitiedot))
          : [defaultEmptyLokalisoituLink(null, projekti.kielitiedot)],
        kysymyksetJaPalautteetViimeistaan: projekti.vuorovaikutusKierros?.kysymyksetJaPalautteetViimeistaan || null,
        palautteidenVastaanottajat:
          projekti.vuorovaikutusKierros?.palautteidenVastaanottajat || projektiHenkilot.map((hlo) => hlo.kayttajatunnus),
      },
    };

    return tallentamisTiedot;
  }, [projekti, projektiHenkilot]);

  const formOptions: UseFormProps<SuunnittelunPerustiedotFormValues> = {
    resolver: yupResolver(suunnittelunPerustiedotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: { projekti },
  };

  const useFormReturn = useForm<SuunnittelunPerustiedotFormValues>(formOptions);
  const {
    reset,
    handleSubmit,
    formState: { isDirty },
    control,
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const confirmPublish = () => {
    setIsOpenHyvaksy(true);
  };

  const confirmPoista = () => {
    setOpenPoistoDialogi(true);
  };

  const saveDraftAndRedirect = async (formData: SuunnittelunPerustiedotFormValues) => {
    await saveDraft(formData);
    router.push({
      pathname: "/yllapito/projekti/[oid]/suunnittelu/vuorovaikuttaminen",
      query: { oid: projekti.oid },
    });
  };

  const saveSuunnitteluvaihe = useCallback(
    async (formData: SuunnittelunPerustiedotFormValues) => {
      await api.tallennaProjekti(formData);
      if (reloadProjekti) {
        await reloadProjekti();
      }
    },
    [api, reloadProjekti]
  );

  const updateSuunnitteluvaihe = useCallback(
    async (formData: SuunnittelunPerustiedotFormValues) => {
      const partialFormData: VuorovaikutusPerustiedotInput = {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: {
          vuorovaikutusNumero: projekti.vuorovaikutusKierros?.vuorovaikutusNumero || 1,
          hankkeenKuvaus: poistaTypeNameJaTurhatKielet(formData.vuorovaikutusKierros.hankkeenKuvaus, projekti.kielitiedot),
          arvioSeuraavanVaiheenAlkamisesta: formData.vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta,
          kysymyksetJaPalautteetViimeistaan: formData.vuorovaikutusKierros.kysymyksetJaPalautteetViimeistaan || Date.now().toString(),
          suunnittelunEteneminenJaKesto: formData.vuorovaikutusKierros.suunnittelunEteneminenJaKesto,
          palautteidenVastaanottajat: formData.vuorovaikutusKierros.palautteidenVastaanottajat,
          esittelyaineistot: handleAineistoArraysForSave(
            formData.vuorovaikutusKierros.esittelyaineistot,
            formData.vuorovaikutusKierros.poistetutEsittelyaineistot
          ),
          suunnitelmaluonnokset: handleAineistoArraysForSave(
            formData.vuorovaikutusKierros.suunnitelmaluonnokset,
            formData.vuorovaikutusKierros.poistetutSuunnitelmaluonnokset
          ),
          // Jostain syystä videoihin generoituu ylimääräinen kieli tyhjillä tiedoilla juuri ennen tätä kohtaa
          videot: formData.vuorovaikutusKierros.videot
            ?.map((video) => poistaTypeNameJaTurhatKielet(video, projekti.kielitiedot))
            .filter((video) => video) as LokalisoituLinkkiInput[],
          suunnittelumateriaali: formData.vuorovaikutusKierros.suunnittelumateriaali,
        },
      };
      if (partialFormData.vuorovaikutusKierros && !partialFormData.vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta?.SUOMI) {
        partialFormData.vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta = null;
      }
      if (partialFormData.vuorovaikutusKierros && !partialFormData.vuorovaikutusKierros.suunnittelunEteneminenJaKesto?.SUOMI) {
        partialFormData.vuorovaikutusKierros.suunnittelunEteneminenJaKesto = null;
      }
      await api.paivitaPerustiedot(partialFormData);
      if (reloadProjekti) {
        await reloadProjekti();
      }
    },
    [api, projekti.kielitiedot, projekti.oid, projekti.versio, projekti.vuorovaikutusKierros?.vuorovaikutusNumero, reloadProjekti]
  );

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const saveDraft = useCallback(
    async (formData: SuunnittelunPerustiedotFormValues) => {
      setIsFormSubmitting(true);
      if (formData.vuorovaikutusKierros && !formData.vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta?.SUOMI) {
        formData.vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta = null;
      }
      if (formData.vuorovaikutusKierros && !formData.vuorovaikutusKierros.suunnittelunEteneminenJaKesto?.SUOMI) {
        formData.vuorovaikutusKierros.suunnittelunEteneminenJaKesto = null;
      }
      // Jostain syystä suunnittelumateriaaliin generoituu ylimääräinen kieli tyhjillä tiedoilla, joten poistetaan se
      const formDataSuunnitteluMateriaali = formData.vuorovaikutusKierros.suunnittelumateriaali;
      let suunnittelumateriaali: LokalisoituLinkkiInput[] | undefined = undefined;
      if (formDataSuunnitteluMateriaali) {
        suunnittelumateriaali =
          (formDataSuunnitteluMateriaali
            .map((link) => poistaTypeNameJaTurhatKielet(link, projekti.kielitiedot))
            .filter((link) => link) as LokalisoituLinkkiInput[]) || undefined;
      }
      formData = {
        ...formData,
        vuorovaikutusKierros: {
          ...formData.vuorovaikutusKierros,
          esittelyaineistot: handleAineistoArraysForSave(
            formData.vuorovaikutusKierros.esittelyaineistot,
            formData.vuorovaikutusKierros.poistetutEsittelyaineistot
          ),
          suunnitelmaluonnokset: handleAineistoArraysForSave(
            formData.vuorovaikutusKierros.suunnitelmaluonnokset,
            formData.vuorovaikutusKierros.poistetutSuunnitelmaluonnokset
          ),
          // Jostain syystä videoihin generoituu ylimääräinen kieli tyhjillä tiedoilla, joten poistetaan se
          videot: formData.vuorovaikutusKierros.videot
            ?.map((video) => poistaTypeNameJaTurhatKielet(video, projekti.kielitiedot))
            .filter((video) => video) as LokalisoituLinkkiInput[],
          suunnittelumateriaali,
        },
      };
      delete formData.vuorovaikutusKierros.poistetutEsittelyaineistot;
      delete formData.vuorovaikutusKierros.poistetutSuunnitelmaluonnokset;
      try {
        await saveSuunnitteluvaihe(formData);
        showSuccessMessage("Tallennus onnistui");
      } catch (e) {
        log.error("OnSubmit Error", e);
      }
      setIsFormSubmitting(false);
    },
    [projekti.kielitiedot, saveSuunnitteluvaihe, showSuccessMessage]
  );

  const saveAfterPublish = useCallback(
    async (formData: SuunnittelunPerustiedotFormValues) => {
      setIsFormSubmitting(true);
      try {
        await updateSuunnitteluvaihe(formData);
        showSuccessMessage("Julkaisu onnistui");
      } catch (e) {
        log.error("OnSubmit Error", e);
      }
      setIsFormSubmitting(false);
      setIsOpenHyvaksy(false);
    },
    [updateSuunnitteluvaihe, showSuccessMessage]
  );

  const julkinen = projekti.vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.JULKINEN;

  const { t } = useTranslation();

  const poistaKierros = useCallback(async () => {
    let mounted = true;
    if (!projekti) {
      return;
    }
    setIsFormSubmitting(true);
    try {
      await api.siirraTila({
        oid: projekti.oid,
        toiminto: TilasiirtymaToiminto.HYLKAA,
        tyyppi: TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS,
        syy: "Poistetaan luonnos",
      });
      await reloadProjekti();
      showSuccessMessage(`Luonnoksen poistaminen onnistui`);
    } catch (error) {
      log.error(error);
    }
    if (mounted) {
      setIsFormSubmitting(false);
      setOpenPoistoDialogi(false);
    }
    return () => (mounted = false);
  }, [api, projekti, reloadProjekti, showSuccessMessage]);

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form>
          <Section noDivider>
            <h3 className="vayla-subtitle">Suunnitteluvaiheen perustiedot</h3>
            <SectionContent>
              {!julkinen && (
                <p>
                  Suunnitteluvaiheen perustiedot tulevat näkyviin palvelun julkisella puolella. Tietoja on mahdollistaa päivittää koko
                  suunnitteluvaiheen ajan. Kutsu vuorovaikutukseen luodaan seuraavalla välilehdellä. Täytä ensin tämän sivun pakolliset
                  kentät, jonka jälkeen pystyt siirtymään kutsun täyttämiseen ja julkaisuun.
                </p>
              )}
            </SectionContent>
          </Section>
          <SuunnittelunEteneminenJaArvioKestosta kielitiedot={projekti.kielitiedot} />
          <EiJulkinenLuonnoksetJaAineistotLomake vuorovaikutus={projekti.vuorovaikutusKierros} />
          <Section>
            <h4 className="vayla-small-title">Kysymykset ja palautteet</h4>
            <SectionContent>
              <h4 className="vayla-label">Kysymyksien esittäminen ja palautteiden antaminen</h4>
              <p>Anna päivämäärä, johon mennessä kansalaisten toivotaan esittävän kysymykset ja palautteet.</p>
              <HassuDatePickerWithController<SuunnittelunPerustiedotFormValues>
                className="mt-8"
                label="Kysymykset ja palautteet viimeistään"
                minDate={today()}
                textFieldProps={{
                  required: true,
                  sx: { maxWidth: { md: "min-content" } },
                }}
                controllerProps={{ name: "vuorovaikutusKierros.kysymyksetJaPalautteetViimeistaan" }}
              />
            </SectionContent>
            <SectionContent>
              <h4 className="vayla-label">Kysymysten ja palautteiden vastaanottajat</h4>
              <p>
                Järjestelmään saapuneesta uudesta kysymyksestä tai palautteesta lähetetään automaattisesti sähköpostitse tieto valituille
                henkilöille. Jos et halua sähköpostiin tiedotetta jokaisesta saapuneesta kysymyksestä tai palautteesta, ota valinta pois
                päältä. Tässä tapauksessa vastaanottaja saa viestin vain kerran viikossa.
              </p>
              <p>
                Projektiin kysymysten ja palautteiden vastaanottajien tiedot haetaan Projektin henkilöt -sivulle tallennetuista tiedoista.
                Jos henkilöistä puuttuu nimi, tee korjaus Projektin henkilöt -sivulle ja päivitä sivu.
              </p>
              {projekti?.kayttoOikeudet && projekti.kayttoOikeudet.length > 0 ? (
                <Controller
                  control={control}
                  name={`vuorovaikutusKierros.palautteidenVastaanottajat`}
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormGroup label="" inlineFlex>
                      {projektiHenkilot.map((hlo, index) => {
                        const tunnuslista = value || [];
                        return (
                          <Fragment key={index}>
                            <CheckBox
                              label={yhteystietoVirkamiehelleTekstiksi(hlo, t)}
                              onChange={(event) => {
                                if (!event.target.checked) {
                                  onChange(tunnuslista.filter((tunnus) => tunnus !== hlo.kayttajatunnus));
                                } else {
                                  onChange([...tunnuslista, hlo.kayttajatunnus]);
                                }
                              }}
                              checked={tunnuslista.includes(hlo.kayttajatunnus)}
                              {...field}
                            />
                          </Fragment>
                        );
                      })}
                    </FormGroup>
                  )}
                />
              ) : (
                <p>Projektilla ei ole tallennettuja henkilöitä</p>
              )}
            </SectionContent>
          </Section>
          <Section noDivider>
            <Stack justifyContent="space-between" flexDirection="row" flexWrap="wrap">
              {!julkinen && projekti.vuorovaikutusKierros?.vuorovaikutusNumero && projekti.vuorovaikutusKierros.vuorovaikutusNumero > 1 && (
                <Stack justifyContent={[undefined, undefined, "flex-start"]} direction={["column", "column", "row"]}>
                  <Button
                    id="poista_luonnos"
                    style={{ whiteSpace: "nowrap" }}
                    type="button"
                    onClick={confirmPoista}
                    disabled={isFormSubmitting}
                  >
                    Poista luonnos
                  </Button>
                </Stack>
              )}
              <Stack justifyContent={[undefined, undefined, "flex-end"]} direction={["column", "column", "row"]} flexWrap="wrap">
                {!julkinen && (
                  <Button
                    style={{ whiteSpace: "nowrap" }}
                    id="save_suunnitteluvaihe_perustiedot"
                    onClick={handleSubmit(saveDraft)}
                    disabled={isFormSubmitting}
                  >
                    Tallenna luonnos
                  </Button>
                )}
                {!julkinen && (
                  <Button
                    style={{ whiteSpace: "nowrap" }}
                    id="save_suunnitteluvaihe_perustiedot_and_redirect"
                    onClick={handleSubmit(saveDraftAndRedirect)}
                    disabled={isFormSubmitting}
                    primary
                  >
                    Tallenna ja siirry
                  </Button>
                )}
                {julkinen && (
                  <Button
                    style={{ whiteSpace: "nowrap" }}
                    id="save_published_suunnitteluvaihe"
                    onClick={handleSubmit(confirmPublish)}
                    disabled={isFormSubmitting}
                  >
                    Päivitä muutokset
                  </Button>
                )}
              </Stack>
            </Stack>
          </Section>
        </form>
      </FormProvider>

      <SaapuneetKysymyksetJaPalautteet projekti={projekti} />
      <HassuDialog open={isOpenHyvaksy} title="Suunnitteluvaiheen perustietojen päivitys" onClose={closeHyvaksy}>
        <form style={{ display: "contents" }}>
          <DialogContent>
            <p>Olet päivittämässä suunnitteluvaiheen perustietoja kansalaispuolelle.</p>
            <div className="content">
              <p>Klikkaamalla Hyväksy ja julkaise -painiketta vahvistat perustiedot tarkastetuksi ja hyväksyt niiden julkaisun.</p>
            </div>
          </DialogContent>
          <DialogActions>
            <Button primary id="accept_publish" onClick={handleSubmit(saveAfterPublish)}>
              Hyväksy ja julkaise
            </Button>
            <Button id="cancel_publish" type="button" onClick={closeHyvaksy}>
              Peruuta
            </Button>
          </DialogActions>
        </form>
      </HassuDialog>
      <KierroksenPoistoDialogi
        openPoistoDialogi={openPoistoDialogi}
        setOpenPoistoDialogi={setOpenPoistoDialogi}
        poistaKierros={poistaKierros}
      />
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
