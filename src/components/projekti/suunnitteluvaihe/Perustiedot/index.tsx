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
import FormGroup from "@components/form/FormGroup";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import useProjektiHenkilot from "src/hooks/useProjektiHenkilot";
import SuunnittelunEteneminenJaArvioKestosta from "./SuunnittelunEteneminenJaArvioKestosta";
import router from "next/router";
import { getDefaultValuesForLokalisoituText } from "src/util/getDefaultValuesForLokalisoituText";
import useTranslation from "next-translate/useTranslation";
import { getKaannettavatKielet, KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import KierroksenPoistoButton from "../KierroksenPoistoButton";
import { handleAineistoArrayForDefaultValues } from "src/util/FormAineisto/handleAineistoArrayForDefaultValues";
import { handleAineistoArraysForSave } from "src/util/FormAineisto/handleAineistoArraysForSave";
import SuunnitelmaLuonnoksetJaEsittelyAineistot from "./SuunnitelmaLuonnoksetJaEsittelyAineistot.tsx";
import EnnaltaKuvattuVideoesittely from "./EnnaltaKuvattuVideoesittely";
import MuuEsittelymateriaali from "./MuuEsittelymateriaali";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useValidationMode from "src/hooks/useValidationMode";
import { H2, H3 } from "../../../Headings";
import { getDefaultValuesForLokalisoituLinkkiLista } from "src/util/getDefaultValuesForLokalisoituLinkkiLista";
import { FormAineisto } from "src/util/FormAineisto";
import { useCheckAineistoValmiit } from "src/hooks/useCheckAineistoValmiit";
import { canVuorovaikutusKierrosBeDeleted } from "common/util/vuorovaikutuskierros/validateVuorovaikutusKierrosCanBeDeleted";
import { useShowTallennaProjektiMessage } from "src/hooks/useShowTallennaProjektiMessage";

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
    | "videot"
    | "suunnittelumateriaali"
    | "kysymyksetJaPalautteetViimeistaan"
    | "palautteidenVastaanottajat"
  > & {
    poistetutEsittelyaineistot: FormAineisto[];
    poistetutSuunnitelmaluonnokset: FormAineisto[];
    esittelyaineistot: FormAineisto[];
    suunnitelmaluonnokset: FormAineisto[];
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
    formState: { isDirty, isSubmitting },
    control,
  } = useFormReturn;

  const checkAineistoValmiit = useCheckAineistoValmiit(projekti.oid);

  useLeaveConfirm(!isSubmitting && isDirty);

  const confirmPublish = () => {
    setIsOpenHyvaksy(true);
  };

  const saveDraftAndRedirect = async (formData: SuunnittelunPerustiedotFormValues) => {
    await saveDraft(formData);
    await router.push({
      pathname: "/yllapito/projekti/[oid]/suunnittelu/vuorovaikuttaminen",
      query: { oid: projekti.oid },
    });
  };

  const updateSuunnitteluvaihe = useCallback(
    async (formData: SuunnittelunPerustiedotFormValues) => {
      const {
        esittelyaineistot,
        poistetutEsittelyaineistot,
        poistetutSuunnitelmaluonnokset,
        suunnitelmaluonnokset,
        vuorovaikutusNumero,
        arvioSeuraavanVaiheenAlkamisesta,
        kysymyksetJaPalautteetViimeistaan,
        palautteidenVastaanottajat,
        suunnittelumateriaali,
        suunnittelunEteneminenJaKesto,
        videot,
      } = formData.vuorovaikutusKierros;
      const partialFormData: VuorovaikutusPerustiedotInput = {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: {
          vuorovaikutusNumero: vuorovaikutusNumero || 1,
          arvioSeuraavanVaiheenAlkamisesta: arvioSeuraavanVaiheenAlkamisesta,
          kysymyksetJaPalautteetViimeistaan: kysymyksetJaPalautteetViimeistaan || Date.now().toString(),
          suunnittelunEteneminenJaKesto: suunnittelunEteneminenJaKesto,
          palautteidenVastaanottajat: palautteidenVastaanottajat,
          esittelyaineistot: handleAineistoArraysForSave(esittelyaineistot, poistetutEsittelyaineistot),
          suunnitelmaluonnokset: handleAineistoArraysForSave(suunnitelmaluonnokset, poistetutSuunnitelmaluonnokset),
          videot: getDefaultValuesForLokalisoituLinkkiLista(projekti.kielitiedot, videot),
          suunnittelumateriaali: getDefaultValuesForLokalisoituLinkkiLista(projekti.kielitiedot, suunnittelumateriaali),
        },
      };
      await api.paivitaPerustiedot(partialFormData);
      await checkAineistoValmiit({ retries: 5 });
      await reloadProjekti?.();
    },
    [api, projekti.kielitiedot, projekti.oid, projekti.versio, reloadProjekti, checkAineistoValmiit]
  );

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const showTallennaProjektiMessage = useShowTallennaProjektiMessage();

  const saveDraft = useCallback(
    (formData: SuunnittelunPerustiedotFormValues) =>
      withLoadingSpinner(
        (async () => {
          const {
            poistetutEsittelyaineistot,
            esittelyaineistot,
            poistetutSuunnitelmaluonnokset,
            suunnitelmaluonnokset,
            ...vuorovaikutusKierros
          } = formData.vuorovaikutusKierros;

          const tallennaProjektiInput: TallennaProjektiInput = {
            oid: formData.oid,
            versio: formData.versio,
            vuorovaikutusKierros: {
              ...vuorovaikutusKierros,
              esittelyaineistot: handleAineistoArraysForSave(esittelyaineistot, poistetutEsittelyaineistot),
              suunnitelmaluonnokset: handleAineistoArraysForSave(suunnitelmaluonnokset, poistetutSuunnitelmaluonnokset),
            },
          };
          try {
            const response = await api.tallennaProjekti(tallennaProjektiInput);
            await checkAineistoValmiit({ retries: 5 });
            await reloadProjekti?.();
            showTallennaProjektiMessage(response);
          } catch (e) {
            log.error("OnSubmit Error", e);
          }
        })()
      ),
    [withLoadingSpinner, api, checkAineistoValmiit, reloadProjekti, showTallennaProjektiMessage]
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

  const kierrosCanBeDeleted = canVuorovaikutusKierrosBeDeleted(projekti);

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form>
          <Section noDivider>
            <H2>Suunnitteluvaiheen perustiedot</H2>
            <SectionContent>
              {!julkinen && (
                <p>
                  Suunnitteluvaiheen perustiedot tulevat näkyviin palvelun julkisella puolella. Tietoja on mahdollista päivittää koko
                  suunnitteluvaiheen ajan. Kutsu vuorovaikutukseen luodaan seuraavalla välilehdellä. Täytä ensin tämän sivun pakolliset
                  kentät, jonka jälkeen pystyt siirtymään kutsun täyttämiseen ja julkaisuun.
                </p>
              )}
            </SectionContent>
          </Section>
          <SuunnittelunEteneminenJaArvioKestosta kielitiedot={projekti.kielitiedot} />
          <SuunnitelmaLuonnoksetJaEsittelyAineistot />
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
            <Stack justifyContent={kierrosCanBeDeleted ? "space-between" : "flex-end"} flexDirection="row" flexWrap="wrap">
              {kierrosCanBeDeleted && <KierroksenPoistoButton projekti={projekti} reloadProjekti={reloadProjekti} />}
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

      <SaapuneetKysymyksetJaPalautteet projekti={projekti} lukutila={false} />
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
    </>
  );
}
