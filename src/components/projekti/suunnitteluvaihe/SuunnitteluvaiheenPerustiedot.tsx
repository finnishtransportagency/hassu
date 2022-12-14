import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { maxHankkeenkuvausLength, suunnittelunPerustiedotSchema } from "src/schemas/suunnittelunPerustiedot";
import SectionContent from "@components/layout/SectionContent";
import Textarea from "@components/form/Textarea";
import { KuulutusJulkaisuTila, api, Kieli, SuunnitteluVaiheInput, SuunnitteluVaiheTila, TallennaProjektiInput } from "@services/api";
import Section from "@components/layout/Section";
import lowerCase from "lodash/lowerCase";
import { ReactElement, useMemo, useState } from "react";
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

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
  suunnitteluVaihe: Pick<
    SuunnitteluVaiheInput,
    "hankkeenKuvaus" | "arvioSeuraavanVaiheenAlkamisesta" | "suunnittelunEteneminenJaKesto" | "tila"
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

    const hankkeenKuvausHasBeenCreated: boolean = !!projekti.suunnitteluVaihe?.hankkeenKuvaus;

    // SUOMI hankkeen kuvaus on aina lomakkeella, RUOTSI JA SAAME vain jos kyseinen kieli on projektin kielitiedoissa.
    // Jos kieli ei ole kielitiedoissa kyseisen kielen kenttää ei tule lisätä hankkeenKuvaus olioon
    // Tästä syystä pickBy:llä poistetaan undefined hankkeenkuvaus tiedot.
    const hankkeenKuvaus: FormValues["suunnitteluVaihe"]["hankkeenKuvaus"] = hankkeenKuvausHasBeenCreated
      ? {
          SUOMI: projekti.suunnitteluVaihe?.hankkeenKuvaus?.SUOMI || "",
          ...pickBy(
            {
              RUOTSI: hasRuotsinKieli ? projekti.suunnitteluVaihe?.hankkeenKuvaus?.RUOTSI || "" : undefined,
              SAAME: hasSaamenKieli ? projekti.suunnitteluVaihe?.hankkeenKuvaus?.SAAME || "" : undefined,
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
      suunnitteluVaihe: {
        arvioSeuraavanVaiheenAlkamisesta: projekti.suunnitteluVaihe?.arvioSeuraavanVaiheenAlkamisesta || "",
        suunnittelunEteneminenJaKesto: projekti.suunnitteluVaihe?.suunnittelunEteneminenJaKesto || "",
        hankkeenKuvaus: hankkeenKuvaus,
        tila: projekti.suunnitteluVaihe?.tila,
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
  } = useFormReturn;

  useLeaveConfirm(isDirty);

  const confirmPublish = () => {
    setOpenHyvaksy(true);
  };

  const saveAndPublish = async (formData: FormValues) => {
    setIsFormSubmitting(true);
    try {
      formData.suunnitteluVaihe.tila = SuunnitteluVaiheTila.JULKINEN;
      await saveSuunnitteluvaihe(formData);
      showSuccessMessage("Tallennus ja julkaisu onnistui");
    } catch (e) {
      log.error("OnSubmit Error", e);
      showErrorMessage("Tallennuksessa tapahtui virhe");
    }
    setIsFormSubmitting(false);
    setOpenHyvaksy(false);
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
  const julkinen = !!projekti.suunnitteluVaihe?.tila;

  const suunnitteluVaiheCanBePublished = canProjektiBePublished(projekti);

  return (
    <>
      {julkinen && (
        <Notification type={NotificationType.INFO_GREEN}>
          Suunnitteluvaiheen perustiedot on julkaistu palvelun julkisella puolella. Voit muokata kuvausta, sekä tietoja etenemisestä ja
          kestosta. Muutokset päivittyvät palvelun julkiselle puolella Tallenna ja päivitä -painikkeen painamisen jälkeen.
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
              {...register(`suunnitteluVaihe.hankkeenKuvaus.${ensisijainenKieli}`)}
              error={
                (errors.suunnitteluVaihe?.hankkeenKuvaus as any)?.[
                  kielitiedot?.ensisijainenKieli ? kielitiedot.ensisijainenKieli : Kieli.SUOMI
                ]
              }
              maxLength={maxHankkeenkuvausLength}
            />
            {toissijainenKieli && (
              <Textarea
                label={`Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (${lowerCase(toissijainenKieli)}) *`}
                {...register(`suunnitteluVaihe.hankkeenKuvaus.${toissijainenKieli}`)}
                error={(errors.suunnitteluVaihe?.hankkeenKuvaus as any)?.[toissijainenKieli]}
                maxLength={maxHankkeenkuvausLength}
              />
            )}
          </Section>

          <Section>
            <h5 className="vayla-small-title">Suunnittelun eteneminen ja arvio kestosta</h5>
            <SectionContent>
              <p>
                Kuvaa kansalaiselle suunnittelun etenemistä ja sen tilaa. Voit käyttää alla olevaan kenttään tuotua vakiotekstiä tai kertoa
                omin sanoin.{" "}
              </p>
              <Textarea
                label="Julkisella puolella esitettävä suunnittelun etenemisen kuvaus"
                maxLength={maxHankkeenkuvausLength}
                {...register("suunnitteluVaihe.suunnittelunEteneminenJaKesto")}
                error={errors.suunnitteluVaihe?.suunnittelunEteneminenJaKesto}
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
                {...register("suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta")}
                error={errors.suunnitteluVaihe?.arvioSeuraavanVaiheenAlkamisesta}
              ></TextInput>
            </SectionContent>
          </Section>
          {projekti && <SaapuneetKysymyksetJaPalautteet projekti={projekti} />}
          <input type="hidden" {...register("suunnitteluVaihe.tila", { setValueAs: (value) => value || null })} />
        </form>
      </FormProvider>
      <Section noDivider>
        <Stack justifyContent={[undefined, undefined, "flex-end"]} direction={["column", "column", "row"]}>
          {!julkinen && (
            <Button id="save_suunnitteluvaihe_perustiedot_draft" onClick={handleSubmit(saveDraft)} disabled={isFormSubmitting}>
              Tallenna luonnos
            </Button>
          )}
          <Button
            primary
            id="save_and_publish"
            onClick={handleSubmit(confirmPublish)}
            disabled={isFormSubmitting || !suunnitteluVaiheCanBePublished}
          >
            {julkinen ? "Tallenna ja päivitä julkaisua" : "Tallenna ja julkaise perustiedot"}
          </Button>
        </Stack>
      </Section>
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
            <Button primary id="accept_publish" onClick={handleSubmit(saveAndPublish)}>
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

function canProjektiBePublished(projekti: ProjektiLisatiedolla): boolean {
  return projektiHasPublishedAloituskuulutusJulkaisu(projekti);
}

const projektiHasPublishedAloituskuulutusJulkaisu: (projekti: ProjektiLisatiedolla) => boolean = (projekti) =>
  !!(
    projekti.aloitusKuulutusJulkaisu?.tila &&
    [KuulutusJulkaisuTila.HYVAKSYTTY, KuulutusJulkaisuTila.MIGROITU].includes(projekti.aloitusKuulutusJulkaisu.tila)
  );
