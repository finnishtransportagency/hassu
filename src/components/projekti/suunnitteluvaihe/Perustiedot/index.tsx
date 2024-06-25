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
import { Checkbox, DialogActions, DialogContent, FormControlLabel, Stack } from "@mui/material";
import Button from "@components/button/Button";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import HassuDialog from "@components/HassuDialog";
import SaapuneetKysymyksetJaPalautteet from "../SaapuneetKysymyksetJaPalautteet";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import useApi from "src/hooks/useApi";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { today } from "hassu-common/util/dateUtils";
import FormGroup from "@components/form/FormGroup";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import useProjektiHenkilot from "src/hooks/useProjektiHenkilot";
import SuunnittelunEteneminenJaArvioKestosta from "./SuunnittelunEteneminenJaArvioKestosta";
import router from "next/router";
import { getDefaultValuesForLokalisoituText } from "src/util/getDefaultValuesForLokalisoituText";
import { poistaTypeNameJaTurhatKielet } from "src/util/removeExtraLanguagesAndTypename";
import useTranslation from "next-translate/useTranslation";
import { getKaannettavatKielet, KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import KierroksenPoistoDialogi from "../KierroksenPoistoDialogi";
import { handleAineistoArrayForDefaultValues } from "src/util/handleAineistoArrayForDefaultValues";
import { handleAineistoArraysForSave } from "src/util/handleAineistoArraysForSave";
import SuunnitelmaLuonnoksetJaEsittelyAineistot from "./SuunnitelmaLuonnoksetJaEsittelyAineistot.tsx";
import EnnaltaKuvattuVideoesittely from "./EnnaltaKuvattuVideoesittely";
import MuuEsittelymateriaali from "./MuuEsittelymateriaali";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useValidationMode from "src/hooks/useValidationMode";
import { H2, H3 } from "../../../Headings";

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
  const { showSuccessMessage } = useSnackbars();
  const [isOpenHyvaksy, setIsOpenHyvaksy] = useState(false);
  const [openPoistoDialogi, setOpenPoistoDialogi] = useState(false);

  const closeHyvaksy = useCallback(() => {
    setIsOpenHyvaksy(false);
  }, []);

  const { withLoadingSpinner, isLoading } = useLoadingSpinner();

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
        ...(!projekti.vuorovaikutusKierros?.hankkeenKuvaus && {
          hankkeenKuvaus: poistaTypeNameJaTurhatKielet(projekti.aloitusKuulutus?.hankkeenKuvaus, projekti.kielitiedot),
        }),
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
            RUOTSI:
              "Planeringsskedet är rätt tidpunkt att sätta sig in i och påverka planlösningarna och föra fram information " +
              "om lokala förhållanden som eventuellt påverkar färdigställandet av planen. " +
              "I interaktionen under planeringen presenteras planutkast och planlösningar. " +
              "Det är möjligt att ge respons på planutkasten och ställa frågor. " +
              "\n\n" +
              "Respons och frågor som kommit in efter presentationen av utkasten gås igenom och planen färdigställs. " +
              "Därefter läggs den färdiga planen fram till påseende, " +
              "och sakägarna har möjlighet att lämna in en officiell anmärkning om planen.",
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

  const validationMode = useValidationMode();

  const formOptions: UseFormProps<SuunnittelunPerustiedotFormValues, ProjektiValidationContext> = {
    resolver: yupResolver(suunnittelunPerustiedotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: { projekti, validationMode },
  };

  const useFormReturn = useForm<SuunnittelunPerustiedotFormValues, ProjektiValidationContext>(formOptions);
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
    (formData: SuunnittelunPerustiedotFormValues) =>
      withLoadingSpinner(
        (async () => {
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
        })()
      ),
    [projekti.kielitiedot, saveSuunnitteluvaihe, showSuccessMessage, withLoadingSpinner]
  );

  const saveAfterPublish = useCallback(
    (formData: SuunnittelunPerustiedotFormValues) =>
      withLoadingSpinner(
        (async () => {
          try {
            await updateSuunnitteluvaihe(formData);
            showSuccessMessage("Julkaisu onnistui");
          } catch (e) {
            log.error("OnSubmit Error", e);
          }
          setIsOpenHyvaksy(false);
        })()
      ),
    [withLoadingSpinner, updateSuunnitteluvaihe, showSuccessMessage]
  );

  const julkinen = projekti.vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.JULKINEN;

  const { t } = useTranslation();

  const poistaKierros = useCallback(
    () =>
      withLoadingSpinner(
        (async () => {
          if (!projekti) {
            return;
          }
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
          setOpenPoistoDialogi(false);
        })()
      ),
    [api, projekti, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  const isUusiKierros = useMemo(() => {
    if (!julkinen && projekti.vuorovaikutusKierros?.vuorovaikutusNumero && projekti.vuorovaikutusKierros.vuorovaikutusNumero > 1) {
      return true;
    }
    return false;
  }, [julkinen, projekti.vuorovaikutusKierros?.vuorovaikutusNumero]);

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form>
          <Section noDivider>
            <H2>Suunnitteluvaiheen perustiedot</H2>
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
          <SuunnitelmaLuonnoksetJaEsittelyAineistot vuorovaikutus={projekti.vuorovaikutusKierros} />
          <EnnaltaKuvattuVideoesittely />
          <MuuEsittelymateriaali kielitiedot={projekti?.kielitiedot} />
          <Section>
            <H2>Kysymykset ja palautteet</H2>
            <SectionContent>
              <H3>Kysymyksien esittäminen ja palautteiden antaminen</H3>
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
              <H3>Kysymysten ja palautteiden vastaanottajat</H3>
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
                      {projektiHenkilot.map((hlo) => {
                        const tunnuslista = value || [];
                        return (
                          <Fragment key={hlo.kayttajatunnus}>
                            <FormControlLabel
                              sx={{ marginLeft: "0px" }}
                              label={yhteystietoVirkamiehelleTekstiksi(hlo, t)}
                              control={
                                <Checkbox
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
                              }
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
            <Stack justifyContent={isUusiKierros ? "space-between" : "flex-end"} flexDirection="row" flexWrap="wrap">
              {isUusiKierros && (
                <Stack justifyContent={[undefined, undefined, "flex-start"]} direction={["column", "column", "row"]}>
                  <Button id="poista_luonnos" style={{ whiteSpace: "nowrap" }} type="button" onClick={confirmPoista} disabled={isLoading}>
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
                    disabled={isLoading}
                  >
                    Tallenna luonnos
                  </Button>
                )}
                {!julkinen && (
                  <Button
                    style={{ whiteSpace: "nowrap" }}
                    id="save_suunnitteluvaihe_perustiedot_and_redirect"
                    onClick={handleSubmit(saveDraftAndRedirect)}
                    disabled={isLoading}
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
                    disabled={isLoading}
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
    </>
  );
}
