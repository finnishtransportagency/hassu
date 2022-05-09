import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { suunnittelunPerustiedotSchema, maxHankkeenkuvausLength } from "src/schemas/suunnittelunPerustiedot";
import SectionContent from "@components/layout/SectionContent";
import Textarea from "@components/form/Textarea";
import { Kieli, SuunnitteluVaiheInput, TallennaProjektiInput, api, Projekti } from "@services/api";
import Section from "@components/layout/Section";
import lowerCase from "lodash/lowerCase";
import { ReactElement, useEffect, useState } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import TextInput from "@components/form/TextInput";
import { Stack } from "@mui/material";
import Button from "@components/button/Button";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import HassuSpinner from "@components/HassuSpinner";
import { removeTypeName } from "src/util/removeTypeName";
import { KeyedMutator } from "swr";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import HassuStack from "@components/layout/HassuStack";
import HassuDialog from "@components/HassuDialog";
import WindowCloseButton from "@components/button/WindowCloseButton";

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
  projekti?: Projekti | null;
  reloadProjekti?: KeyedMutator<ProjektiLisatiedolla | null>;
  isDirtyHandler: (isDirty: boolean) => void;
}

export default function SuunnitteluvaiheenPerustiedot({
  projekti,
  reloadProjekti,
  isDirtyHandler,
}: Props): ReactElement {
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

  return (
    <>
      {julkinen && (
        <Notification type={NotificationType.INFO_GREEN}>
          Suunnitteluvaiheen perustiedot on julkaistu palvelun julkisella puolella. Voit muokata kuvausta, sekä tietoja
          etenemisestä ja kestosta. Muutokset päivittyvät palvelun julkiselle puolella Tallenna ja päivitä -painikkeen
          painamisen jälkeen.
        </Notification>
      )}
      <FormProvider {...useFormReturn}>
        <form>
          <Section>
            <SectionContent largeGaps>
              <h5 className="vayla-small-title">Hankkeen sisällönkuvaus</h5>
              <p>
                Kirjoita kenttään tiivistetty sisällönkuvaus hankkeesta. Kuvauksen on hyvä sisältää esimerkiksi tieto
                suunnittelukohteen alueellista rajauksesta (maantiealue ja vaikutusalue), suunnittelun tavoitteet,
                vaikutukset ja toimenpiteet pääpiirteittäin karkealla tasolla. Älä lisää tekstiin linkkejä.
              </p>
            </SectionContent>
            {!julkinen && (
              <Notification type={NotificationType.INFO_GRAY}>
                Tiivistetty hankkeen sisälönkuvaus on noudettu aloituskuulutuvaiheesta. Voit muokata kuvausta. Muutokset
                tulevat näkyviin palvelun julkiselle puolella Tallenna ja julkaise -painikkeen painamisen jälkeen.
              </Notification>
            )}

            <Textarea
              label={`Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä (${lowerCase(
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
                label={`Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (${lowerCase(
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
                Kuvaa kansalaiselle suunnittelun etenemistä ja sen tilaa. Voit käyttää alla olevaan kenttään tuotua
                vakiotekstiä tai kertoa omin sanoin.{" "}
              </p>
              <Textarea
                label="Julkisella puolella esitettävä suunnittelun etenemisen kuvaus"
                maxLength={maxHankkeenkuvausLength}
                {...register("suunnitteluVaihe.suunnittelunEteneminenJaKesto")}
                error={errors.suunnitteluVaihe?.suunnittelunEteneminenJaKesto}
              />
              <p>
                Anna arvio hallinnollisen käsittelyn seuraavan vaiheen alkamisesta. Seuraava vaihe on nähtävillä olo,
                jossa kansalaisilla on mahdollisuus jättää muistutuksia tehtyihin suunnitelmiin.
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
          <Section>
            <h5 className="vayla-small-title">Saapuneet kysymykset ja palautteet</h5>
            <SectionContent>
              <p>
                {projekti.suunnitteluVaihe?.palautteet
                  ? `Kysymyksiä tai palautteita ${projekti.suunnitteluVaihe.palautteet.length} kpl.`
                  : "Ei saapuneita kysymyksiä tai palautteita"}
              </p>
            </SectionContent>
          </Section>
          <input type="hidden" {...register("suunnitteluVaihe.julkinen")} />
        </form>
      </FormProvider>
      <Section noDivider>
        <Stack justifyContent={[undefined, undefined, "flex-end"]} direction={["column", "column", "row"]}>
          {!julkinen && (
            <Button onClick={handleSubmit(saveDraft)} disabled={isFormSubmitting}>
              Tallenna luonnos
            </Button>
          )}
          <Button primary onClick={handleSubmit(confirmPublish)} disabled={isFormSubmitting}>
            {julkinen ? "Tallenna ja päivitä julkaisua" : "Tallenna ja julkaise perustiedot"}
          </Button>
          <Button disabled>Nähtävilläolon kuuluttaminen</Button>
        </Stack>
      </Section>
      <div>
        <HassuDialog open={openHyvaksy} onClose={() => setOpenHyvaksy(false)}>
          <Section noDivider smallGaps>
            <SectionContent>
              <div className="vayla-dialog-title flex">
                <div className="flex-grow">Suunnitteluvaiheen perustietojen julkaisu</div>
                <div className="justify-end">
                  <WindowCloseButton onClick={() => setOpenHyvaksy(false)}></WindowCloseButton>
                </div>
              </div>
            </SectionContent>
            <SectionContent>
              <div className="vayla-dialog-content">
                <form>
                  <p>Olet julkaisemassa suunnitteluvaiheen perustiedot kansalaispuolelle.</p>
                  <div className="content">
                    <p>
                      Jos perustietoihin pitää tehdä muutoksia julkaisun jälkeen, tulee perustiedot avata uudelleen ja
                      tehdä tallennus ja julkaisun päivitys.
                    </p>
                    <p>
                      Klikkaamalla Hyväksy ja julkaise -painiketta vahvistat perustiedot tarkastetuksi ja hyväksyt sen
                      julkaisun.
                    </p>
                  </div>
                  <HassuStack
                    direction={["column", "column", "row"]}
                    justifyContent={[undefined, undefined, "flex-end"]}
                    paddingTop={"1rem"}
                  >
                    <Button primary onClick={handleSubmit(saveAndPublish)}>
                      Hyväksy ja julkaise
                    </Button>
                    <Button
                      onClick={(e) => {
                        setOpenHyvaksy(false);
                        e.preventDefault();
                      }}
                    >
                      Peruuta
                    </Button>
                  </HassuStack>
                </form>
              </div>
            </SectionContent>
          </Section>
        </HassuDialog>
      </div>
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
