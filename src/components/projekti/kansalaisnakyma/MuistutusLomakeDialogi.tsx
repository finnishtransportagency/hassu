import { DialogActions, DialogContent } from "@mui/material";
import React, { ReactElement, useCallback, useState } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import HassuDialog from "@components/HassuDialog";
import HassuGrid from "@components/HassuGrid";
import { FormProvider, useForm, UseFormProps, Controller, FieldError } from "react-hook-form";
import { palauteSchema } from "src/schemas/vuorovaikutus";
import { yupResolver } from "@hookform/resolvers/yup";
import useTranslation from "next-translate/useTranslation";
import { ProjektiJulkinen, PalauteInput, api, NahtavillaoloVaiheJulkaisuJulkinen } from "@services/api";
import { formatDate } from "src/util/dateUtils";
import TextInput from "@components/form/TextInput";
import Textarea from "@components/form/Textarea";
import IconButton from "@components/button/IconButton";
import FormGroup, { Label } from "@components/form/FormGroup";
import axios from "axios";
import HassuSpinner from "@components/HassuSpinner";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import Section from "@components/layout/Section";

interface Props {
  open: boolean;
  onClose: () => void;
  nahtavillaolo: NahtavillaoloVaiheJulkaisuJulkinen;
  projekti: ProjektiJulkinen;
}

interface PalauteFormInput {
  etunimi: string;
  sukunimi: string;
  sahkoposti: string;
  puhelinnumero: string;
  kysymysTaiPalaute: string;
  yhteydenottotapaEmail: boolean | null;
  yhteydenottotapaPuhelin: boolean | null;
  liite: string | null;
}

const defaultValues = {
  kysymysTaiPalaute: "",
  yhteydenottotapaEmail: false,
  yhteydenottotapaPuhelin: false,
  liite: null,
};

export default function MuistutusLomakeDialogi({ open, onClose, projekti, nahtavillaolo }: Props): ReactElement {
  const { t } = useTranslation();
  const [tiedosto, setTiedosto] = useState<File | undefined>(undefined);
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);
  const [kiitosDialogiOpen, setKiitosDialogiOpen] = useState(false);
  const [tiedostoLiianSuuri, setTiedostoLiianSuuri] = useState(false);

  const formOptions: UseFormProps<PalauteFormInput> = {
    resolver: yupResolver(palauteSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  };
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const useFormReturn = useForm<PalauteFormInput>(formOptions);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    reset,
  } = useFormReturn;

  const talletaTiedosto = useCallback(async (tiedosto: File) => {
    const contentType = (tiedosto as Blob).type || "application/octet-stream";
    const response = await api.valmisteleTiedostonLataus(tiedosto.name, contentType);
    await axios.put(response.latausLinkki, tiedosto, {
      headers: {
        "Content-Type": contentType,
      },
    });
    return response.tiedostoPolku;
  }, []);

  const save = useCallback(
    async (formData: PalauteFormInput) => {
      setFormIsSubmitting(true);
      try {
        const palauteFinalValues: PalauteInput = { ...formData, liite: null };
        if (tiedosto) {
          palauteFinalValues.liite = await talletaTiedosto(tiedosto);
        }
        (Object.keys(palauteFinalValues) as Array<keyof PalauteInput>).forEach((key) => {
          if (!palauteFinalValues[key]) delete palauteFinalValues[key];
        });
        await api.lisaaPalaute(projekti.oid, palauteFinalValues);
        showSuccessMessage(t("common:ilmoitukset.tallennus_onnistui"));
        onClose();
        setKiitosDialogiOpen(true);
        reset(defaultValues);
      } catch (e) {
        log.log("OnSubmit Error", e);
        showErrorMessage(t("common:ilmoitukset.tallennuksessa_tapahtui_virhe"));
      }
      setFormIsSubmitting(false);
    },
    [talletaTiedosto, projekti, onClose, showErrorMessage, showSuccessMessage, reset, t, tiedosto]
  );

  return (
    <>
      <HassuDialog scroll="body" open={open} title={t("projekti:jata_palaute_tai")} onClose={onClose} maxWidth={"md"}>
        <DialogContent>
          <p>
            {t("projekti:muistutuslomake.voit_antaa_muistutuksen", {
              pvm: formatDate(nahtavillaolo.muistutusoikeusPaattyyPaiva),
            })}
          </p>
          <p>
            {t("projekti:muistutuslomake.kasittelemme_henkilotietoja", {
              url: window.location.protocol + "//" + window.location.host + "/TBA",
            })}
          </p>
          <FormProvider {...useFormReturn}>
            <form>
              <Section>
                <HassuStack>
                  <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 2]}>
                    <TextInput
                      label={t("common:etunimi")}
                      {...register("etunimi")}
                      error={
                        errors?.etunimi?.message
                          ? ({ message: t(`common:virheet.${errors.etunimi.message}`) } as FieldError)
                          : undefined
                      }
                    />
                    <TextInput
                      label={t("common:sukunimi")}
                      {...register("sukunimi")}
                      error={
                        errors?.sukunimi?.message
                          ? ({ message: t(`common:virheet.${errors.sukunimi.message}`) } as FieldError)
                          : undefined
                      }
                    />
                    <TextInput
                      label={t("common:katuosoite")}
                      {...register("sahkoposti")}
                      error={
                        errors?.sahkoposti?.message
                          ? ({ message: t(`common:virheet.${errors.sahkoposti.message}`) } as FieldError)
                          : undefined
                      }
                    />
                    <TextInput
                      label={t("common:postinumero_ja_paikka")}
                      {...register("sahkoposti")}
                      error={
                        errors?.sahkoposti?.message
                          ? ({ message: t(`common:virheet.${errors.sahkoposti.message}`) } as FieldError)
                          : undefined
                      }
                    />

                    <TextInput
                      label={t("common:sahkoposti")}
                      {...register("sahkoposti")}
                      error={
                        errors?.sahkoposti?.message
                          ? ({ message: t(`common:virheet.${errors.sahkoposti.message}`) } as FieldError)
                          : undefined
                      }
                    />
                    <TextInput
                      label={t("common:puhelinnumero")}
                      {...register("puhelinnumero")}
                      error={
                        errors?.puhelinnumero?.message
                          ? ({ message: t(`common:virheet.${errors.puhelinnumero.message}`) } as FieldError)
                          : undefined
                      }
                    />
                  </HassuGrid>
                </HassuStack>
              </Section>
              <HassuStack>
                <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 2]}>
                  <Label style={{ fontWeight: "bold" }}>{t("projekti:muistutuslomake.suunnitelman_asiatunnus")}</Label>
                  <Label style={{ fontWeight: "bold" }}>{t("projekti:muistutuslomake.suunnitelman_nimi")}</Label>
                  <Label>{projekti.velho.asiatunnusVayla || "<Asiatunnus puuttuu>"}</Label>
                  <Label>{projekti.velho.nimi}</Label>
                </HassuGrid>
              </HassuStack>
              <Textarea
                minRows={3}
                maxRows={13}
                className="mt-4"
                label={`${t("projekti:muistutuslomake.muistutus")} *`}
                {...register("kysymysTaiPalaute")}
                error={
                  errors?.kysymysTaiPalaute?.message
                    ? ({ message: t(`common:virheet.${errors.kysymysTaiPalaute.message}`) } as FieldError)
                    : undefined
                }
              />

              <div className="mt-3">
                <p style={{ fontWeight: "bold" }}>{t("common:liite")}</p>
                <p>{t("projekti:muistutuslomake.tuetut_tiedostomuodot_ovat")}</p>
                {tiedosto ? (
                  <FormGroup
                    label={t("common:valittu_tiedosto")}
                    errorMessage={errors?.liite?.message ? t(`common:virheet.${errors.liite.message}`) : ""}
                  >
                    <HassuStack direction="row">
                      <div style={{ marginTop: "auto", marginBottom: "auto" }}>
                        <div>{tiedosto.name}</div>
                        {tiedostoLiianSuuri && (
                          <div style={{ color: "red", fontWeight: "bold" }}>{t("common:tiedosto_on_liian_suuri")}</div>
                        )}
                      </div>
                      <IconButton
                        icon="trash"
                        onClick={() => {
                          setTiedosto(undefined);
                          setTiedostoLiianSuuri(false);
                          (document.getElementById("file-input") as HTMLInputElement).value = "";
                          setValue("liite", null);
                        }}
                      />
                    </HassuStack>
                  </FormGroup>
                ) : (
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById("file-input")?.click();
                    }}
                  >
                    {t("common:hae_tiedosto")}
                  </Button>
                )}
                <Controller
                  render={({ field }) => (
                    <input
                      className="hidden"
                      id="file-input"
                      type="file"
                      accept="image/jpeg, image/png, image/jpg, application/pdf"
                      onChange={(e) => {
                        const tiedosto = e.target.files?.[0];
                        setTiedosto(tiedosto);
                        if (tiedosto && tiedosto.size > 4500000) {
                          setTiedostoLiianSuuri(true);
                        }
                        field.onChange(e.target.value);
                      }}
                    />
                  )}
                  name="liite"
                  control={control}
                  defaultValue={null}
                  shouldUnregister
                />
              </div>
            </form>
          </FormProvider>
        </DialogContent>

        <DialogActions>
          <Button primary onClick={handleSubmit(save)} disabled={tiedostoLiianSuuri}>
            {t("common:laheta")}
          </Button>
          <Button
            onClick={(e) => {
              onClose();
              e.preventDefault();
            }}
          >
            {t("common:peruuta")}
          </Button>
        </DialogActions>
        <HassuSpinner open={formIsSubmitting} />
      </HassuDialog>
      <KiitosDialogi open={kiitosDialogiOpen} onClose={() => setKiitosDialogiOpen(false)} />
    </>
  );
}

interface KiitosProps {
  open: boolean;
  onClose: () => void;
}

export function KiitosDialogi({ open, onClose }: KiitosProps): ReactElement {
  const { t } = useTranslation();
  return (
    <HassuDialog
      scroll="body"
      open={open}
      title={t("projekti:muistutuslomake.kiitos_viestista")}
      onClose={onClose}
      maxWidth={"sm"}
    >
      <DialogContent>
        <p>{t("projekti:muistutuslomake.olemme_vastaanottaneet_viestisi")}</p>
        <p>{t("projekti:muistutuslomake.kaikki_viestit_kasitellaan")}</p>
        <p>{t("projekti:muistutuslomake.jos_toivoit_yhteydenottoa")}</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} primary>
          {t("common:sulje")}
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
