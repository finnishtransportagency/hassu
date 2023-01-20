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
import { Fragment, ReactElement, useCallback, useMemo, useState, useEffect } from "react";
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
import { today } from "src/util/dateUtils";
import FormGroup from "@components/form/FormGroup";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import CheckBox from "@components/form/CheckBox";
import useProjektiHenkilot from "src/hooks/useProjektiHenkilot";
import SuunnittelunEteneminenJaArvioKestosta from "./SuunnittelunEteneminenJaArvioKestosta";
import EiJulkinenLuonnoksetJaAineistotLomake from "../LuonnoksetJaAineistot/EiJulkinen";
import router from "next/router";
import { getDefaultValuesForLokalisoituText } from "src/util/getDefaultValuesForLokalisoituText";

type ProjektiFields = Pick<TallennaProjektiInput, "oid" | "versio">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

export type SuunnittelunPerustiedotFormValues = RequiredProjektiFields & {
  vuorovaikutusKierros: Pick<
    VuorovaikutusKierrosInput,
    | "vuorovaikutusNumero"
    | "arvioSeuraavanVaiheenAlkamisesta"
    | "suunnittelunEteneminenJaKesto"
    | "esittelyaineistot"
    | "suunnitelmaluonnokset"
    | "videot"
    | "suunnittelumateriaali"
    | "kysymyksetJaPalautteetViimeistaan"
    | "palautteidenVastaanottajat"
  >;
};

export const defaultEmptyLokalisoituLink = (
  link: LokalisoituLinkkiInput | null | undefined,
  kielitiedot: Kielitiedot | null | undefined
): LokalisoituLinkkiInput => {
  if (!link) {
    const lokalisoituLinkki: Partial<LokalisoituLinkkiInput> = {};
    lokalisoituLinkki[kielitiedot?.ensisijainenKieli || Kieli.SUOMI] = { url: "", nimi: "" };
    if (kielitiedot?.toissijainenKieli) {
      lokalisoituLinkki[kielitiedot.toissijainenKieli] = { url: "", nimi: "" };
    }
    return lokalisoituLinkki as LokalisoituLinkkiInput;
  }
  const lokalisoituLinkki: Partial<LokalisoituLinkkiInput> = {};
  Object.keys(link).forEach((key) => {
    lokalisoituLinkki[key as Kieli] = { url: link[key as Kieli]?.url || "", nimi: link[key as Kieli]?.nimi || "" };
  });
  return lokalisoituLinkki as LokalisoituLinkkiInput;
};

const defaultListWithEmptyLokalisoituLink = (
  list: LokalisoituLinkkiInput[] | null | undefined,
  kielitiedot: Kielitiedot | null | undefined
): LokalisoituLinkkiInput[] => {
  if (!list || !list.length) {
    const lokalisoituLinkkiArray: LokalisoituLinkkiInput[] = [];
    const lokalisoituLinkki: Partial<LokalisoituLinkkiInput> = {};
    lokalisoituLinkki[kielitiedot?.ensisijainenKieli || Kieli.SUOMI] = { url: "", nimi: "" };
    if (kielitiedot?.toissijainenKieli) {
      lokalisoituLinkki[kielitiedot.toissijainenKieli] = { url: "", nimi: "" };
    }
    lokalisoituLinkkiArray.push(lokalisoituLinkki as LokalisoituLinkki);
    return lokalisoituLinkkiArray;
  }
  return (list || []).map((link) => {
    const lokalisoituLinkki: Partial<LokalisoituLinkkiInput> = {};
    Object.keys(link).forEach((key) => {
      lokalisoituLinkki[key as Kieli] = { url: link[key as Kieli]?.url || "", nimi: link[key as Kieli]?.nimi || "" };
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
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const [openHyvaksy, setOpenHyvaksy] = useState(false);

  const api = useApi();

  const defaultValues: SuunnittelunPerustiedotFormValues = useMemo(() => {
    const tallentamisTiedot: SuunnittelunPerustiedotFormValues = {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: projekti.vuorovaikutusKierros?.vuorovaikutusNumero || 0, // TODO mieti
        arvioSeuraavanVaiheenAlkamisesta: getDefaultValuesForLokalisoituText(
          projekti.kielitiedot,
          projekti.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta
        ),
        suunnittelunEteneminenJaKesto: getDefaultValuesForLokalisoituText(
          projekti.kielitiedot,
          projekti.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto,
          {
            SUOMI:
              "Suunnitteluvaihe on oikea aika perehtyä ja vaikuttaa suunnitelmaratkaisuihin sekä " +
              "tuoda esiin suunnitelman viimeistelyyn mahdollisesti vaikuttavia tietoja paikallisista olosuhteista. " +
              "Suunnittelun aikaisessa vuorovaikutuksessa esitellään suunnitelman luonnoksia ja suunnitelmaratkaisuja. " +
              "Suunnitelmaluonnoksista on mahdollista antaa palautetta sekä esittää kysymyksiä. " +
              "\n\n" +
              "Luonnosten esittelyn jälkeen saadut palautteet ja kysymykset käydään läpi ja suunnitelma viimeistellään. " +
              "Tämän jälkeen valmis suunnitelma asetetaan nähtäville, jolloin asianosaisilla on mahdollisuus jättää suunnitelmasta virallinen muistutus.",
            RUOTSI: "",
            SAAME: "",
          }
        ),
        esittelyaineistot:
          projekti.vuorovaikutusKierros?.esittelyaineistot?.map(({ dokumenttiOid, nimi }) => ({
            dokumenttiOid,
            nimi,
          })) || [],
        suunnitelmaluonnokset:
          projekti.vuorovaikutusKierros?.suunnitelmaluonnokset?.map(({ dokumenttiOid, nimi }) => ({
            dokumenttiOid,
            nimi,
          })) || [],
        videot: defaultListWithEmptyLokalisoituLink(projekti.vuorovaikutusKierros?.videot, projekti.kielitiedot),
        suunnittelumateriaali: defaultEmptyLokalisoituLink(projekti?.vuorovaikutusKierros?.suunnittelumateriaali, projekti.kielitiedot),
        kysymyksetJaPalautteetViimeistaan: projekti.vuorovaikutusKierros?.kysymyksetJaPalautteetViimeistaan || null,
      },
    };

    return tallentamisTiedot;
  }, [projekti]);

  const formOptions: UseFormProps<SuunnittelunPerustiedotFormValues> = {
    resolver: yupResolver(suunnittelunPerustiedotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
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
    setOpenHyvaksy(true);
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
          vuorovaikutusNumero: projekti.vuorovaikutusKierros?.vuorovaikutusNumero || 0,
          arvioSeuraavanVaiheenAlkamisesta: formData.vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta,
          kysymyksetJaPalautteetViimeistaan: formData.vuorovaikutusKierros.kysymyksetJaPalautteetViimeistaan || Date.now().toString(),
          suunnittelunEteneminenJaKesto: formData.vuorovaikutusKierros.suunnittelunEteneminenJaKesto,
          palautteidenVastaanottajat: formData.vuorovaikutusKierros.palautteidenVastaanottajat,
          esittelyaineistot: formData.vuorovaikutusKierros.esittelyaineistot,
          suunnitelmaluonnokset: formData.vuorovaikutusKierros.suunnitelmaluonnokset,
          videot: formData.vuorovaikutusKierros.videot,
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
    [api, projekti.oid, projekti.versio, projekti.vuorovaikutusKierros?.vuorovaikutusNumero, reloadProjekti]
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
      try {
        await saveSuunnitteluvaihe(formData);
        showSuccessMessage("Tallennus onnistui!");
      } catch (e) {
        log.error("OnSubmit Error", e);
        showErrorMessage("Tallennuksessa tapahtui virhe");
      }
      setIsFormSubmitting(false);
    },
    [saveSuunnitteluvaihe, showErrorMessage, showSuccessMessage]
  );

  const saveAfterPublish = useCallback(
    async (formData: SuunnittelunPerustiedotFormValues) => {
      setIsFormSubmitting(true);
      try {
        await updateSuunnitteluvaihe(formData);
        showSuccessMessage("Julkaisu onnistui!");
      } catch (e) {
        log.error("OnSubmit Error", e);
        showErrorMessage("Tallennuksessa tapahtui virhe");
      }
      setIsFormSubmitting(false);
      setOpenHyvaksy(false);
    },
    [updateSuunnitteluvaihe, showErrorMessage, showSuccessMessage]
  );

  const julkinen = projekti.vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.JULKINEN;

  const projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[] = useProjektiHenkilot(projekti);

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form>
          <Section noDivider>
            <h3 className="vayla-title">Suunnitteluvaiheen perustiedot</h3>
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
                henkilöille. Jos poistat valinnan, vastaanottajaa tiedotetaan kerran viikossa.
              </p>
              <p>
                Projektiin kysymysten ja palautteiden vastaanottajien tiedot haetaan Projektin henkilöt -sivulle tallennetuista tiedoista.
                Jos henkilöistä puuttuu nimi, korjaa tieto Projektin henkilöt -sivulla ja päivitä tämä sivu.
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
                              label={yhteystietoVirkamiehelleTekstiksi(hlo)}
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
            <Stack justifyContent={[undefined, undefined, "flex-end"]} direction={["column", "column", "row"]}>
              {!julkinen && (
                <Button id="save_suunnitteluvaihe_perustiedot" onClick={handleSubmit(saveDraft)} disabled={isFormSubmitting}>
                  Tallenna luonnos
                </Button>
              )}
              {!julkinen && (
                <Button
                  id="save_suunnitteluvaihe_perustiedot_and_redirect"
                  onClick={handleSubmit(saveDraftAndRedirect)}
                  disabled={isFormSubmitting}
                  primary
                >
                  Tallenna luonnos ja siirry seuraavalle sivulle
                </Button>
              )}
              {julkinen && (
                <Button id="save_published_suunnitteluvaihe" onClick={handleSubmit(confirmPublish)} disabled={isFormSubmitting}>
                  Tallenna ja julkaise
                </Button>
              )}
            </Stack>
          </Section>
        </form>
      </FormProvider>

      {projekti && <SaapuneetKysymyksetJaPalautteet projekti={projekti} />}
      <HassuDialog open={openHyvaksy} title="Suunnitteluvaiheen perustietojen päivitys" onClose={() => setOpenHyvaksy(false)}>
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
            <Button
              id="cancel_publish"
              onClick={(e) => {
                setOpenHyvaksy(false);
                e.preventDefault();
              }}
            >
              Peruuta
            </Button>
          </DialogActions>
        </form>
      </HassuDialog>
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
