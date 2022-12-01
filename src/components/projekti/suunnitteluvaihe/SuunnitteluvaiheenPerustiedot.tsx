import { Controller, FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { maxHankkeenkuvausLength, suunnittelunPerustiedotSchema } from "src/schemas/suunnittelunPerustiedot";
import SectionContent from "@components/layout/SectionContent";
import Textarea from "@components/form/Textarea";
import { Kieli, TallennaProjektiInput, VuorovaikutusKierrosInput, VuorovaikutusKierrosTila, Yhteystieto } from "@services/api";
import Section from "@components/layout/Section";
import lowerCase from "lodash/lowerCase";
import { ReactElement, useMemo, useState, Fragment } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import TextInput from "@components/form/TextInput";
import { DialogActions, DialogContent, Stack } from "@mui/material";
import Button from "@components/button/Button";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import HassuSpinner from "@components/HassuSpinner";
import HassuDialog from "@components/HassuDialog";
import SaapuneetKysymyksetJaPalautteet from "./SaapuneetKysymyksetJaPalautteet";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { KeyedMutator } from "swr";
import { pickBy } from "lodash";
import useApi from "src/hooks/useApi";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { today } from "src/util/dateUtils";
import FormGroup from "@components/form/FormGroup";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import CheckBox from "@components/form/CheckBox";
import useProjektiHenkilot from "src/hooks/useProjektiHenkilot";

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
  vuorovaikutusKierros: Pick<
    VuorovaikutusKierrosInput,
    | "hankkeenKuvaus"
    | "arvioSeuraavanVaiheenAlkamisesta"
    | "suunnittelunEteneminenJaKesto"
    | "vuorovaikutusNumero"
    | "kysymyksetJaPalautteetViimeistaan"
    | "palautteidenVastaanottajat"
  >;
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

  const defaultValues: FormValues = useMemo(() => {
    const { ensisijainenKieli, toissijainenKieli } = projekti.kielitiedot || {};

    const hasRuotsinKieli = ensisijainenKieli === Kieli.RUOTSI || toissijainenKieli === Kieli.RUOTSI;
    const hasSaamenKieli = ensisijainenKieli === Kieli.SAAME || toissijainenKieli === Kieli.SAAME;

    const hankkeenKuvausHasBeenCreated: boolean = !!projekti.vuorovaikutusKierros?.hankkeenKuvaus;

    // SUOMI hankkeen kuvaus on aina lomakkeella, RUOTSI JA SAAME vain jos kyseinen kieli on projektin kielitiedoissa.
    // Jos kieli ei ole kielitiedoissa kyseisen kielen kenttää ei tule lisätä hankkeenKuvaus olioon
    // Tästä syystä pickBy:llä poistetaan undefined hankkeenkuvaus tiedot.
    const hankkeenKuvaus: FormValues["vuorovaikutusKierros"]["hankkeenKuvaus"] = hankkeenKuvausHasBeenCreated
      ? {
          SUOMI: projekti.vuorovaikutusKierros?.hankkeenKuvaus?.SUOMI || "",
          ...pickBy(
            {
              RUOTSI: hasRuotsinKieli ? projekti.vuorovaikutusKierros?.hankkeenKuvaus?.RUOTSI || "" : undefined,
              SAAME: hasSaamenKieli ? projekti.vuorovaikutusKierros?.hankkeenKuvaus?.SAAME || "" : undefined,
            },
            (value) => value !== undefined
          ),
        }
      : {
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
      vuorovaikutusKierros: {
        vuorovaikutusNumero: projekti.vuorovaikutusKierros?.vuorovaikutusNumero || 0, // TODO mieti
        arvioSeuraavanVaiheenAlkamisesta: projekti.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta || "",
        suunnittelunEteneminenJaKesto: projekti.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto || "",
        hankkeenKuvaus: hankkeenKuvaus,
        kysymyksetJaPalautteetViimeistaan: projekti.vuorovaikutusKierros?.kysymyksetJaPalautteetViimeistaan,
      },
    };
    return tallentamisTiedot;
  }, [projekti]);

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(suunnittelunPerustiedotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  };

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
    control,
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const confirmPublish = () => {
    setOpenHyvaksy(true);
  };

  const saveDraftAndRedirect = async (formData: FormValues) => {
    await saveDraft(formData);
    // TODO: redirect
  };

  const saveDraft = async (formData: FormValues) => {
    setIsFormSubmitting(true);
    try {
      await saveSuunnitteluvaihe(formData);
      showSuccessMessage("Tallennus onnistui!");
    } catch (e) {
      log.error("OnSubmit Error", e);
      showErrorMessage("Tallennuksessa tapahtui virhe");
    }
    setIsFormSubmitting(false);
  };

  const api = useApi();

  const saveSuunnitteluvaihe = async (formData: FormValues) => {
    await api.tallennaProjekti(formData);
    if (reloadProjekti) {
      await reloadProjekti();
    }
    reset(formData);
  };

  const kielitiedot = projekti.kielitiedot;
  const ensisijainenKieli = projekti.kielitiedot ? projekti.kielitiedot.ensisijainenKieli : Kieli.SUOMI;
  const toissijainenKieli = kielitiedot?.toissijainenKieli;
  const julkinen = projekti.vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.JULKINEN;

  const projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[] = useProjektiHenkilot(projekti);

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
          <Section>
            <SectionContent largeGaps>
              <h5 className="vayla-small-title">Hankkeen sisällönkuvaus</h5>
              <p>
                Kirjoita kenttään tiivistetty sisällönkuvaus hankkeesta. Kuvauksen on hyvä sisältää esimerkiksi tieto suunnittelukohteen
                alueellista rajauksesta (maantiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja toimenpiteet pääpiirteittäin
                karkealla tasolla. Älä lisää tekstiin linkkejä.
              </p>
            </SectionContent>
            {!julkinen && (
              <Notification type={NotificationType.INFO_GRAY}>
                Tiivistetty hankkeen sisällönkuvaus on noudettu aloituskuulutusvaiheesta. Voit muokata kuvausta. Muutokset tulevat näkyviin
                palvelun julkiselle puolella Tallenna ja julkaise -painikkeen painamisen jälkeen.
              </Notification>
            )}

            <Textarea
              label={`Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä (${lowerCase(kielitiedot?.ensisijainenKieli)}) *`}
              {...register(`vuorovaikutusKierros.hankkeenKuvaus.${ensisijainenKieli}`)}
              error={
                (errors.vuorovaikutusKierros?.hankkeenKuvaus as any)?.[
                  kielitiedot?.ensisijainenKieli ? kielitiedot.ensisijainenKieli : Kieli.SUOMI
                ]
              }
              maxLength={maxHankkeenkuvausLength}
            />
            {toissijainenKieli && (
              <Textarea
                label={`Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (${lowerCase(toissijainenKieli)}) *`}
                {...register(`vuorovaikutusKierros.hankkeenKuvaus.${toissijainenKieli}`)}
                error={(errors.vuorovaikutusKierros?.hankkeenKuvaus as any)?.[toissijainenKieli]}
                maxLength={maxHankkeenkuvausLength}
              />
            )}
          </Section>

          <Section noDivider>
            <h5 className="vayla-small-title">Suunnittelun eteneminen ja arvio kestosta</h5>
            <SectionContent>
              <p>
                Kuvaa kansalaiselle suunnittelun etenemistä ja sen tilaa. Voit käyttää alla olevaan kenttään tuotua vakiotekstiä tai kertoa
                omin sanoin.{" "}
              </p>
              <Textarea
                label="Julkisella puolella esitettävä suunnittelun etenemisen kuvaus"
                maxLength={maxHankkeenkuvausLength}
                {...register("vuorovaikutusKierros.suunnittelunEteneminenJaKesto")}
                error={errors.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto}
              />
              <p>
                Anna arvio hallinnollisen käsittelyn seuraavan vaiheen alkamisesta. Seuraava vaihe on nähtävillä olo, jossa kansalaisilla on
                mahdollisuus jättää muistutuksia tehtyihin suunnitelmiin.
              </p>

              <p>
                {`Arvio esitetään palvelun julkisella puolella. Jos arviota ei pystytä antamaan, kirjoita 'Seuraavan
                vaiheen alkamisesta ei pystytä vielä antamaan arviota'`}
                .
              </p>
              <TextInput
                label={"Arvio seuraavan vaiheen alkamisesta *"}
                maxLength={150}
                {...register("vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta")}
                error={errors.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta}
              ></TextInput>
            </SectionContent>
          </Section>
          <Section>
            <h4 className="vayla-small-title">Kysymykset ja palautteet</h4>
            <SectionContent>
              <h4 className="vayla-label">Kysymyksien esittäminen ja palautteiden antaminen</h4>
              <p>Anna päivämäärä, johon mennessä kansalaisten toivotaan esittävän kysymykset ja palautteet.</p>
              <HassuDatePickerWithController<FormValues>
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
