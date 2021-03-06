import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { suunnittelunPerustiedotSchema, maxHankkeenkuvausLength } from "src/schemas/suunnittelunPerustiedot";
import SectionContent from "@components/layout/SectionContent";
import Textarea from "@components/form/Textarea";
import { Kieli, SuunnitteluVaiheInput, TallennaProjektiInput, api, AloitusKuulutusTila } from "@services/api";
import Section from "@components/layout/Section";
import lowerCase from "lodash/lowerCase";
import { ReactElement, useEffect, useState } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import TextInput from "@components/form/TextInput";
import { DialogActions, DialogContent, Stack } from "@mui/material";
import Button from "@components/button/Button";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import HassuSpinner from "@components/HassuSpinner";
import { removeTypeName } from "src/util/removeTypeName";
import HassuDialog from "@components/HassuDialog";
import SaapuneetKysymyksetJaPalautteet from "./SaapuneetKysymyksetJaPalautteet";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
  suunnitteluVaihe: Pick<
    SuunnitteluVaiheInput,
    "hankkeenKuvaus" | "arvioSeuraavanVaiheenAlkamisesta" | "suunnittelunEteneminenJaKesto" | "julkinen"
  >;
};

interface Props {
  isDirtyHandler: (isDirty: boolean) => void;
}

export default function SuunnitteluvaiheenPerustiedot({ isDirtyHandler }: Props): ReactElement {
  const { data: projekti, mutate: reloadProjekti } = useProjekti();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const [openHyvaksy, setOpenHyvaksy] = useState(false);

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(suunnittelunPerustiedotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      suunnitteluVaihe: {
        hankkeenKuvaus: {
          SUOMI: projekti?.aloitusKuulutus?.hankkeenKuvaus?.SUOMI,
          RUOTSI: projekti?.aloitusKuulutus?.hankkeenKuvaus?.RUOTSI,
          SAAME: projekti?.aloitusKuulutus?.hankkeenKuvaus?.SAAME,
        },
      },
    },
  };

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = useFormReturn;

  const confirmPublish = () => {
    setOpenHyvaksy(true);
  };

  const saveAndPublish = async (formData: FormValues) => {
    setIsFormSubmitting(true);
    try {
      formData.suunnitteluVaihe.julkinen = true;
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
    if (reloadProjekti) await reloadProjekti();
  };

  useEffect(() => {
    isDirtyHandler(isDirty);
  }, [isDirty, isDirtyHandler]);

  useEffect(() => {
    if (projekti?.oid) {
      const tallentamisTiedot: FormValues = {
        oid: projekti.oid,
        suunnitteluVaihe: {
          arvioSeuraavanVaiheenAlkamisesta: projekti.suunnitteluVaihe?.arvioSeuraavanVaiheenAlkamisesta,
          suunnittelunEteneminenJaKesto: projekti.suunnitteluVaihe?.suunnittelunEteneminenJaKesto,
          hankkeenKuvaus: removeTypeName(projekti.suunnitteluVaihe?.hankkeenKuvaus),
          julkinen: projekti.suunnitteluVaihe?.julkinen,
        },
      };
      reset(tallentamisTiedot);
    }
  }, [projekti, reset]);

  if (!projekti) {
    return <></>;
  }

  const kielitiedot = projekti.kielitiedot;
  const ensisijainenKieli = projekti.kielitiedot ? projekti.kielitiedot.ensisijainenKieli : Kieli.SUOMI;
  const toissijainenKieli = kielitiedot?.toissijainenKieli;
  const julkinen = projekti.suunnitteluVaihe?.julkinen;

  const suunnitteluVaiheCanBePublished = canProjektiBePublished(projekti);

  return (
    <>
      {julkinen && (
        <Notification type={NotificationType.INFO_GREEN}>
          Suunnitteluvaiheen perustiedot on julkaistu palvelun julkisella puolella. Voit muokata kuvausta, sek?? tietoja
          etenemisest?? ja kestosta. Muutokset p??ivittyv??t palvelun julkiselle puolella Tallenna ja p??ivit?? -painikkeen
          painamisen j??lkeen.
        </Notification>
      )}
      <FormProvider {...useFormReturn}>
        <form>
          <Section>
            <SectionContent largeGaps>
              <h5 className="vayla-small-title">Hankkeen sis??ll??nkuvaus</h5>
              <p>
                Kirjoita kentt????n tiivistetty sis??ll??nkuvaus hankkeesta. Kuvauksen on hyv?? sis??lt???? esimerkiksi tieto
                suunnittelukohteen alueellista rajauksesta (maantiealue ja vaikutusalue), suunnittelun tavoitteet,
                vaikutukset ja toimenpiteet p????piirteitt??in karkealla tasolla. ??l?? lis???? tekstiin linkkej??.
              </p>
            </SectionContent>
            {!julkinen && (
              <Notification type={NotificationType.INFO_GRAY}>
                Tiivistetty hankkeen sis??ll??nkuvaus on noudettu aloituskuulutuvaiheesta. Voit muokata kuvausta.
                Muutokset tulevat n??kyviin palvelun julkiselle puolella Tallenna ja julkaise -painikkeen painamisen
                j??lkeen.
              </Notification>
            )}

            <Textarea
              label={`Tiivistetty hankkeen sis??ll??nkuvaus ensisijaisella kielell?? (${lowerCase(
                kielitiedot?.ensisijainenKieli
              )}) *`}
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
                label={`Tiivistetty hankkeen sis??ll??nkuvaus toissijaisella kielell?? (${lowerCase(
                  toissijainenKieli
                )}) *`}
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
                Kuvaa kansalaiselle suunnittelun etenemist?? ja sen tilaa. Voit k??ytt???? alla olevaan kentt????n tuotua
                vakioteksti?? tai kertoa omin sanoin.{" "}
              </p>
              <Textarea
                label="Julkisella puolella esitett??v?? suunnittelun etenemisen kuvaus"
                maxLength={maxHankkeenkuvausLength}
                {...register("suunnitteluVaihe.suunnittelunEteneminenJaKesto")}
                error={errors.suunnitteluVaihe?.suunnittelunEteneminenJaKesto}
              />
              <p>
                Anna arvio hallinnollisen k??sittelyn seuraavan vaiheen alkamisesta. Seuraava vaihe on n??ht??vill?? olo,
                jossa kansalaisilla on mahdollisuus j??tt???? muistutuksia tehtyihin suunnitelmiin.
              </p>

              <p>
                {`Arvio esitet????n palvelun julkisella puolella. Jos arviota ei pystyt?? antamaan, kirjoita 'Seuraavan
                vaiheen alkamisesta ei pystyt?? viel?? antamaan arviota'`}
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
          {projekti && <SaapuneetKysymyksetJaPalautteet projekti={projekti} reloadProjekti={reloadProjekti} />}
          <input type="hidden" {...register("suunnitteluVaihe.julkinen")} />
        </form>
      </FormProvider>
      <Section noDivider>
        <Stack justifyContent={[undefined, undefined, "flex-end"]} direction={["column", "column", "row"]}>
          {!julkinen && (
            <Button
              id="save_suunnitteluvaihe_perustiedot_draft"
              onClick={handleSubmit(saveDraft)}
              disabled={isFormSubmitting}
            >
              Tallenna luonnos
            </Button>
          )}
          <Button
            primary
            id="save_and_publish"
            onClick={handleSubmit(confirmPublish)}
            disabled={isFormSubmitting || !suunnitteluVaiheCanBePublished}
          >
            {julkinen ? "Tallenna ja p??ivit?? julkaisua" : "Tallenna ja julkaise perustiedot"}
          </Button>
          <Button disabled>N??ht??vill??olon kuuluttaminen</Button>
        </Stack>
      </Section>
      <HassuDialog
        open={openHyvaksy}
        title="Suunnitteluvaiheen perustietojen julkaisu"
        onClose={() => setOpenHyvaksy(false)}
      >
        <form style={{ display: "contents" }}>
          <DialogContent>
            <p>Olet julkaisemassa suunnitteluvaiheen perustiedot kansalaispuolelle.</p>
            <div className="content">
              <p>
                Jos perustietoihin pit???? tehd?? muutoksia julkaisun j??lkeen, tulee perustiedot avata uudelleen ja tehd??
                tallennus ja julkaisun p??ivitys.
              </p>
              <p>
                Klikkaamalla Hyv??ksy ja julkaise -painiketta vahvistat perustiedot tarkastetuksi ja hyv??ksyt sen
                julkaisun.
              </p>
            </div>
          </DialogContent>
          <DialogActions>
            <Button primary id="accept_publish" onClick={handleSubmit(saveAndPublish)}>
              Hyv??ksy ja julkaise
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
  !!projekti.aloitusKuulutusJulkaisut?.some(
    (julkaisu) =>
      julkaisu.tila && [AloitusKuulutusTila.HYVAKSYTTY, AloitusKuulutusTila.MIGROITU].includes(julkaisu.tila)
  );
