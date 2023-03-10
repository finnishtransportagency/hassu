import { DialogActions, DialogContent } from "@mui/material";
import React, { ReactElement, useCallback, useState } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import HassuDialog from "@components/HassuDialog";
import HassuGrid from "@components/HassuGrid";
import { FormProvider, useForm, UseFormProps, Controller, FieldError } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import useTranslation from "next-translate/useTranslation";
import { ProjektiJulkinen, NahtavillaoloVaiheJulkaisuJulkinen, MuistutusInput, SuunnittelustaVastaavaViranomainen } from "@services/api";
import { formatDate, formatDateTime } from "src/util/dateUtils";
import TextInput from "@components/form/TextInput";
import Textarea from "@components/form/Textarea";
import IconButton from "@components/button/IconButton";
import FormGroup, { Label } from "@components/form/FormGroup";
import axios from "axios";
import HassuSpinner from "@components/HassuSpinner";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import Section from "@components/layout/Section";
import { muistutusSchema } from "src/schemas/nahtavillaoloMuistutus";
import getAsiatunnus from "src/util/getAsiatunnus";
import useApi from "src/hooks/useApi";
import Trans from "next-translate/Trans";

interface Props {
  open: boolean;
  onClose: () => void;
  nahtavillaolo: NahtavillaoloVaiheJulkaisuJulkinen;
  projekti: ProjektiJulkinen;
}

interface MuistutusFormInput {
  etunimi: string;
  sukunimi: string;
  katuosoite: string;
  postinumeroJaPostitoimipaikka: string;
  sahkoposti: string;
  puhelinnumero: string;
  muistutus: string;
  liite: string | null;
}

const defaultValues = {
  muistutus: "",
  liite: null,
};

export default function MuistutusLomakeDialogi({ open, onClose, projekti, nahtavillaolo }: Props): ReactElement {
  const { t } = useTranslation();
  const [tiedosto, setTiedosto] = useState<File | undefined>(undefined);
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);
  const [kiitosDialogiOpen, setKiitosDialogiOpen] = useState(false);
  const [tiedostoLiianSuuri, setTiedostoLiianSuuri] = useState(false);

  const formOptions: UseFormProps<MuistutusFormInput> = {
    resolver: yupResolver(muistutusSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  };
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const useFormReturn = useForm<MuistutusFormInput>(formOptions);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    reset,
  } = useFormReturn;

  const api = useApi();

  const talletaTiedosto = useCallback(
    async (tiedosto: File) => {
      const contentType = (tiedosto as Blob).type || "application/octet-stream";
      const response = await api.valmisteleTiedostonLataus(tiedosto.name, contentType);
      await axios.put(response.latausLinkki, tiedosto, {
        headers: {
          "Content-Type": contentType,
        },
      });
      return response.tiedostoPolku;
    },
    [api]
  );

  const save = useCallback(
    async (formData: MuistutusFormInput) => {
      setFormIsSubmitting(true);
      try {
        const muistutusFinalValues: MuistutusInput = { ...formData, liite: null };
        if (tiedosto) {
          muistutusFinalValues.liite = await talletaTiedosto(tiedosto);
        }
        (Object.keys(muistutusFinalValues) as Array<keyof MuistutusInput>).forEach((key) => {
          if (!muistutusFinalValues[key]) delete muistutusFinalValues[key];
        });
        await api.lisaaMuistutus(projekti.oid, muistutusFinalValues);
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
    [tiedosto, api, projekti.oid, showSuccessMessage, t, onClose, reset, talletaTiedosto, showErrorMessage]
  );

  return (
    <>
      <HassuDialog scroll="body" open={open} title={t("projekti:muistutuslomake.jata_muistutus")} onClose={onClose} maxWidth={"md"}>
        <DialogContent>
          <p>
            <Trans
              i18nKey="projekti:muistutuslomake.voit_antaa_muistutuksen"
              values={{
                pvm: formatDate(nahtavillaolo.muistutusoikeusPaattyyPaiva),
              }}
              components={{ b: <b /> }}
            />
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
                        errors?.etunimi?.message ? ({ message: t(`common:virheet.${errors.etunimi.message}`) } as FieldError) : undefined
                      }
                    />
                    <TextInput
                      label={t("common:sukunimi")}
                      {...register("sukunimi")}
                      error={
                        errors?.sukunimi?.message ? ({ message: t(`common:virheet.${errors.sukunimi.message}`) } as FieldError) : undefined
                      }
                    />
                    <TextInput
                      label={t("common:katuosoite")}
                      {...register("katuosoite")}
                      error={
                        errors?.katuosoite?.message
                          ? ({ message: t(`common:virheet.${errors.katuosoite.message}`) } as FieldError)
                          : undefined
                      }
                    />
                    <TextInput
                      label={t("common:postinumero_ja_paikka")}
                      {...register("postinumeroJaPostitoimipaikka")}
                      error={
                        errors?.postinumeroJaPostitoimipaikka?.message
                          ? ({
                              message: t(`common:virheet.${errors.postinumeroJaPostitoimipaikka.message}`),
                            } as FieldError)
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
              <Section noDivider className="mb-0">
                <HassuStack>
                  <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 2]}>
                    <Label style={{ fontWeight: "bold" }}>{t("projekti:muistutuslomake.suunnitelman_asiatunnus")}</Label>
                    <Label style={{ fontWeight: "bold" }}>{t("projekti:muistutuslomake.suunnitelman_nimi")}</Label>
                    <Label>{getAsiatunnus(projekti) || "<Asiatunnus puuttuu>"}</Label>
                    <Label>{projekti.velho.nimi}</Label>
                  </HassuGrid>
                </HassuStack>
                <Textarea
                  minRows={3}
                  maxRows={13}
                  className="mt-4"
                  label={`${t("projekti:muistutuslomake.muistutus")}*`}
                  {...register("muistutus")}
                  error={
                    errors?.muistutus?.message ? ({ message: t(`common:virheet.${errors.muistutus.message}`) } as FieldError) : undefined
                  }
                />
              </Section>

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
                      accept="image/jpeg, image/png, image/jpg, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        const tiedosto = e.target.files?.[0];
                        setTiedosto(tiedosto);
                        if (tiedosto && tiedosto.size > 25 * 1024 * 1024) {
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
          <Button id={"submit_feedback"} primary onClick={handleSubmit(save)} disabled={tiedostoLiianSuuri}>
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
      <KiitosDialogi
        open={kiitosDialogiOpen}
        projekti={projekti}
        nahtavillaolo={nahtavillaolo}
        onClose={() => setKiitosDialogiOpen(false)}
      />
    </>
  );
}

interface KiitosProps {
  open: boolean;
  onClose: () => void;
  nahtavillaolo: NahtavillaoloVaiheJulkaisuJulkinen;
  projekti: ProjektiJulkinen;
}

export function KiitosDialogi({ open, onClose, projekti, nahtavillaolo }: KiitosProps): ReactElement {
  const { t } = useTranslation();
  return (
    <HassuDialog scroll="body" open={open} title={t("projekti:muistutuslomake.kiitos_viestista")} onClose={onClose} maxWidth={"sm"}>
      <DialogContent>
        <p>
          {t("projekti:muistutuslomake.olemme_vastaanottaneet_viestisi", {
            viranomainen: projekti.velho?.suunnittelustaVastaavaViranomainen
              ? projekti.velho?.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO
                ? t("common:vaylaviraston")
                : t("common:ely-keskuksen")
              : "<Viranomaistieto puuttuu>",
          })}
        </p>
        <p>
          {t("projekti:muistutuslomake.voit_antaa_muistutuksia", {
            pvm: formatDateTime(nahtavillaolo.muistutusoikeusPaattyyPaiva),
          })}
        </p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} primary>
          {t("common:sulje")}
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
