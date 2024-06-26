import { Checkbox, DialogActions, DialogContent, FormControlLabel, useMediaQuery, useTheme } from "@mui/material";
import React, { ReactElement, useCallback, useState } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import HassuDialog from "@components/HassuDialog";
import HassuGrid from "@components/HassuGrid";
import { Controller, FieldError, FormProvider, useForm, UseFormProps } from "react-hook-form";
import { palauteSchema } from "src/schemas/vuorovaikutus";
import { yupResolver } from "@hookform/resolvers/yup";
import useTranslation from "next-translate/useTranslation";
import { PalauteInput, ProjektiJulkinen, SuunnittelustaVastaavaViranomainen, VuorovaikutusJulkinen } from "@services/api";
import { formatDate } from "hassu-common/util/dateUtils";
import TextInput from "@components/form/TextInput";
import Textarea from "@components/form/Textarea";
import IconButton from "@components/button/IconButton";
import FormGroup from "@components/form/FormGroup";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import useApi from "src/hooks/useApi";
import ExtLink from "@components/ExtLink";
import { lataaTiedosto } from "../../../util/fileUtil";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { allowedFileTypes, maxFileSize } from "common/fileValidationSettings";
import sx from "@mui/system/sx";

interface Props {
  open: boolean;
  onClose: () => void;
  vuorovaikutus: VuorovaikutusJulkinen;
  projektiOid: string;
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

export default function PalauteLomakeDialogi({ open, onClose, projektiOid, vuorovaikutus, projekti }: Readonly<Props>): ReactElement {
  const { t, lang } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [tiedosto, setTiedosto] = useState<File | undefined>(undefined);
  const [kiitosDialogiOpen, setKiitosDialogiOpen] = useState(false);
  const [tiedostoLiianSuuri, setTiedostoLiianSuuri] = useState(false);

  const formOptions: UseFormProps<PalauteFormInput> = {
    resolver: yupResolver(palauteSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  };
  const { showSuccessMessage } = useSnackbars();
  const useFormReturn = useForm<PalauteFormInput>(formOptions);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    reset,
  } = useFormReturn;

  const api = useApi();

  const getTietosuojaUrl = useCallback(() => {
    if (projekti.velho.suunnittelustaVastaavaViranomainen == SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO) {
      return lang == "sv" ? "https://vayla.fi/sv/trafikledsverket/kontaktuppgifter/dataskyddspolicy" : "https://www.vayla.fi/tietosuoja";
    } else {
      return lang == "sv"
        ? "https://www.ely-keskus.fi/sv/tietosuoja-ja-henkilotietojen-kasittely"
        : "https://www.ely-keskus.fi/tietosuoja-ja-henkilotietojen-kasittely";
    }
  }, [lang, projekti.velho.suunnittelustaVastaavaViranomainen]);

  const talletaTiedosto = useCallback(async (tiedosto: File) => lataaTiedosto(api, tiedosto), [api]);

  const { withLoadingSpinner } = useLoadingSpinner();

  const save = useCallback(
    (formData: PalauteFormInput) =>
      withLoadingSpinner(
        (async () => {
          try {
            const palauteFinalValues: PalauteInput = { ...formData, liite: null };
            if (tiedosto) {
              palauteFinalValues.liite = await talletaTiedosto(tiedosto);
            }
            (Object.keys(palauteFinalValues) as Array<keyof PalauteInput>).forEach((key) => {
              if (!palauteFinalValues[key]) {
                delete palauteFinalValues[key];
              }
            });
            await api.lisaaPalaute(projektiOid, palauteFinalValues);
            showSuccessMessage(t("common:ilmoitukset.tallennus_onnistui"));
            onClose();
            setKiitosDialogiOpen(true);
            reset(defaultValues);
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
        })()
      ),
    [withLoadingSpinner, tiedosto, api, projektiOid, showSuccessMessage, t, onClose, reset, talletaTiedosto]
  );

  return (
    <>
      <HassuDialog
        scroll="body"
        open={open}
        title={t("projekti:jata_palaute_tai")}
        onClose={onClose}
        maxWidth={"md"}
        fullScreen={isMobile}
        PaperProps={isMobile ? { sx: { paddingBottom: 0 } } : undefined}
      >
        <DialogContent>
          <p>{t("projekti:voit_jattaa_palautetta")}</p>
          <p style={{ fontWeight: "bold" }}>
            {t("projekti:kysymykset_ja_palautteet").replace("xx.xx.xxxx", formatDate(vuorovaikutus.kysymyksetJaPalautteetViimeistaan))}
          </p>
          <p>
            {t("projekti:palautelomake.kasittelemme_henkilotietoja")} <ExtLink href={getTietosuojaUrl()}>{getTietosuojaUrl()}</ExtLink>
          </p>
          <FormProvider {...useFormReturn}>
            <form>
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
                    label={t("common:sahkoposti")}
                    {...register("sahkoposti")}
                    error={
                      errors?.sahkoposti?.message
                        ? ({ message: t(`common:virheet.${errors.sahkoposti.message}`) } as FieldError)
                        : undefined
                    }
                  />
                  <TextInput
                    style={{ maxWidth: "15em" }}
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
              <Textarea
                minRows={3}
                maxRows={13}
                className="mt-4"
                label={`${t("projekti:palautelomake.palaute")} *`}
                {...register("kysymysTaiPalaute")}
                error={
                  errors?.kysymysTaiPalaute?.message
                    ? ({ message: t(`common:virheet.${errors.kysymysTaiPalaute.message}`) } as FieldError)
                    : undefined
                }
              />
              <div>
                <p style={{ fontWeight: "bold" }}>{t("projekti:palautelomake.toivottu_yhteydenottotapa")}</p>
                <HassuStack rowGap={0}>
                  <Controller<PalauteFormInput>
                    name="yhteydenottotapaEmail"
                    shouldUnregister
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormControlLabel
                        sx={{ marginLeft: "0px" }}
                        label={t("common:sahkoposti")}
                        control={
                          <Checkbox
                            checked={!!value}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              onChange(!!checked);
                            }}
                            {...field}
                          />
                        }
                      />
                    )}
                  />
                  <Controller<PalauteFormInput>
                    name="yhteydenottotapaPuhelin"
                    shouldUnregister
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormControlLabel
                        sx={{ marginLeft: "0px" }}
                        label={t("projekti:palautelomake.puhelinsoitto")}
                        control={
                          <Checkbox
                            checked={!!value}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              onChange(!!checked);
                            }}
                            {...field}
                          />
                        }
                      />
                    )}
                  />
                </HassuStack>
              </div>
              <div className="mt-3">
                <p style={{ fontWeight: "bold" }}>{t("common:liite")}</p>
                <p>{t("projekti:palautelomake.tuetut_tiedostomuodot_ovat")}</p>
                {tiedosto ? (
                  <FormGroup
                    label={t("common:valittu_tiedosto")}
                    errorMessage={errors?.liite?.message ? t(`common:virheet.${errors.liite.message}`) : ""}
                  >
                    <HassuStack direction="row">
                      <div style={{ marginTop: "auto", marginBottom: "auto" }}>
                        <div>{tiedosto.name}</div>
                        {tiedostoLiianSuuri && (
                          <div style={{ color: "red", fontWeight: "bold" }}>{t("common:virheet.tiedosto_on_liian_suuri")}</div>
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
                      accept={allowedFileTypes.join(", ")}
                      onChange={(e) => {
                        const tiedosto = e.target.files?.[0];
                        setTiedosto(tiedosto);
                        if (tiedosto && tiedosto.size > maxFileSize) {
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
        <DialogActions className={isMobile ? "flex-row-reverse justify-between sticky bottom-0 bg-white border-t py-4 z-10 border-gray-light" : ""}>
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
      </HassuDialog>
      <KiitosDialogi open={kiitosDialogiOpen} onClose={() => setKiitosDialogiOpen(false)} isMobile={isMobile} />
    </>
  );
}

interface KiitosProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export function KiitosDialogi({ open, onClose, isMobile }: Readonly<KiitosProps>): ReactElement {
  const { t } = useTranslation();
  return (
    <HassuDialog scroll="body" open={open} title={t("projekti:palautelomake.kiitos_viestista")} onClose={onClose} maxWidth={"sm"} fullScreen={isMobile}>
      <DialogContent>
        <p>{t("projekti:palautelomake.olemme_vastaanottaneet_viestisi")}</p>
        <p>{t("projekti:palautelomake.kaikki_viestit_kasitellaan")}</p>
        <p>{t("projekti:palautelomake.jos_toivoit_yhteydenottoa")}</p>
      </DialogContent>
      <DialogActions className={isMobile ? "sticky bottom-0 bg-white border-t py-4 z-10 border-gray-light" : ""} >
        <Button onClick={onClose} primary>
          {t("common:sulje")}
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
