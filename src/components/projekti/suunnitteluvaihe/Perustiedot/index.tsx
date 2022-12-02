import { Controller, FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { suunnittelunPerustiedotSchema } from "src/schemas/suunnittelunPerustiedot";
import SectionContent from "@components/layout/SectionContent";
import { LinkkiInput, TallennaProjektiInput, VuorovaikutusKierrosInput, VuorovaikutusKierrosTila, Yhteystieto } from "@services/api";
import Section from "@components/layout/Section";
import { ReactElement, useMemo, useState, Fragment, useCallback } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
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
import { removeTypeName } from "src/util/removeTypeName";
import EiJulkinenLuonnoksetJaAineistotLomake from "../LuonnoksetJaAineistot/EiJulkinen";

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;
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

const defaultListWithEmptyLink = (list: LinkkiInput[] | null | undefined): LinkkiInput[] => {
  if (!list || !list.length) {
    return [{ url: "", nimi: "" }];
  }
  return list.map((link) => ({ nimi: link.nimi, url: link.url }));
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
  const [formContext, setFormContext] = useState<SuunnittelunPerustiedotFormValues>();

  const api = useApi();

  const defaultValues: SuunnittelunPerustiedotFormValues = useMemo(() => {
    const tallentamisTiedot: SuunnittelunPerustiedotFormValues = {
      oid: projekti.oid,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: projekti.vuorovaikutusKierros?.vuorovaikutusNumero || 0, // TODO mieti
        arvioSeuraavanVaiheenAlkamisesta: projekti.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta || "",
        suunnittelunEteneminenJaKesto: projekti.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto || "",
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
        videot: defaultListWithEmptyLink(projekti.vuorovaikutusKierros?.videot as LinkkiInput[]),
        suunnittelumateriaali: (removeTypeName(projekti?.vuorovaikutusKierros?.suunnittelumateriaali) as LinkkiInput) || {
          nimi: "",
          url: "",
        },
        kysymyksetJaPalautteetViimeistaan: projekti.vuorovaikutusKierros?.kysymyksetJaPalautteetViimeistaan,
      },
    };
    return tallentamisTiedot;
  }, [projekti]);

  const formOptions: UseFormProps<SuunnittelunPerustiedotFormValues> = {
    resolver: yupResolver(suunnittelunPerustiedotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: formContext,
  };

  const useFormReturn = useForm<SuunnittelunPerustiedotFormValues>(formOptions);
  const {
    reset,
    handleSubmit,
    formState: { isDirty },
    control,
    getValues,
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const confirmPublish = () => {
    setOpenHyvaksy(true);
  };

  const saveDraftAndRedirect = async (formData: SuunnittelunPerustiedotFormValues) => {
    await saveDraft(formData);
    // TODO: redirect
  };

  const saveSuunnitteluvaihe = useCallback(
    async (formData: SuunnittelunPerustiedotFormValues) => {
      await api.tallennaProjekti(formData);
      if (reloadProjekti) {
        await reloadProjekti();
      }
      reset(formData);
    },
    [reloadProjekti, reset]
  );

  const saveDraft = useCallback(
    async (formData: SuunnittelunPerustiedotFormValues) => {
      setIsFormSubmitting(true);
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

  const julkinen = projekti.vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.JULKINEN;

  const projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[] = useProjektiHenkilot(projekti);

  const updateFormContext = useCallback(() => {
    setFormContext(getValues());
  }, [setFormContext, getValues]);

  return (
    <>
      {julkinen && (
        <Notification type={NotificationType.INFO_GREEN}>
          Vuorovaikutuskierros on julkaistu palvelun julkisella puolella. Voit muokata kuvausta, sekä tietoja etenemisestä ja kestosta.
          Muutokset päivittyvät palvelun julkiselle puolella Tallenna ja päivitä -painikkeen painamisen jälkeen.
        </Notification>
      )}
      <FormProvider {...useFormReturn}>
        <form>
          <SuunnittelunEteneminenJaArvioKestosta />
          <EiJulkinenLuonnoksetJaAineistotLomake vuorovaikutus={projekti.vuorovaikutusKierros} updateFormContext={updateFormContext} />
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
      <HassuDialog open={openHyvaksy} title="Suunnitteluvaiheen perustietojen julkaisu" onClose={() => setOpenHyvaksy(false)}>
        <form style={{ display: "contents" }}>
          <DialogContent>
            <p>Olet julkaisemassa suunnitteluvaiheen perustiedot kansalaispuolelle.</p>
            <div className="content">
              <p>
                Jos perustietoihin pitää tehdä muutoksia julkaisun jälkeen, tulee perustiedot avata uudelleen ja tehdä tallennus ja
                julkaisun päivitys.
              </p>
              <p>Klikkaamalla Hyväksy ja julkaise -painiketta vahvistat perustiedot tarkastetuksi ja hyväksyt sen julkaisun.</p>
            </div>
          </DialogContent>
          <DialogActions>
            <Button primary id="accept_publish" onClick={handleSubmit(saveDraft)}>
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
