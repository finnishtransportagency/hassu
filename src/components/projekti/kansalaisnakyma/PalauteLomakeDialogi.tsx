import { Checkbox, DialogActions, DialogContent, FormControlLabel, styled, useMediaQuery, useTheme } from "@mui/material";
import React, { ReactElement, useCallback, useRef, useState } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import HassuDialog from "@components/HassuDialog";
import HassuGrid from "@components/HassuGrid";
import { Controller, FieldError, FormProvider, useFieldArray, useForm, UseFormProps } from "react-hook-form";
import { palauteSchema } from "src/schemas/vuorovaikutus";
import { yupResolver } from "@hookform/resolvers/yup";
import useTranslation from "next-translate/useTranslation";
import { PalauteInput, ProjektiJulkinen, SuunnittelustaVastaavaViranomainen, VuorovaikutusJulkinen } from "@services/api";
import { formatDate } from "hassu-common/util/dateUtils";
import TextInput from "@components/form/TextInput";
import Textarea from "@components/form/Textarea";
import IconButton from "@components/button/IconButton";
import { ErrorSpan } from "@components/form/FormGroup";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import useApi from "src/hooks/useApi";
import ExtLink from "@components/ExtLink";
import { lataaTiedosto } from "../../../util/fileUtil";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { allowedFileTypes } from "common/fileValidationSettings";
import { joinStringArray } from "common/util/joinStringArray";
import ContentSpacer from "@components/layout/ContentSpacer";
import { ErrorMessage } from "@hookform/error-message";

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
  liitteet: { nimi: string; tiedosto: File; tyyppi: string; koko: number }[];
}

const defaultValues = {
  kysymysTaiPalaute: "",
  yhteydenottotapaEmail: false,
  yhteydenottotapaPuhelin: false,
  liitteet: [],
};

export default function PalauteLomakeDialogi({ open, onClose, projektiOid, vuorovaikutus, projekti }: Readonly<Props>): ReactElement {
  const { t, lang } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [kiitosDialogiOpen, setKiitosDialogiOpen] = useState(false);
  const formOptions: UseFormProps<PalauteFormInput> = {
    resolver: yupResolver(palauteSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  };
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const useFormReturn = useForm<PalauteFormInput>(formOptions);

  const { register, handleSubmit, control, formState, reset, watch } = useFormReturn;
  const { errors } = formState;
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
  const liitteetFieldArray = useFieldArray({ name: "liitteet", control });
  const liitteetWatch = watch("liitteet");
  const inputRef = useRef<HTMLInputElement>(null);
  const constructErrorMessage = useCallback((msg: string) => (msg ? t(`common:virheet.${msg}`) : ""), [t]);
  const save = useCallback(
    ({ liitteet, ...formData }: PalauteFormInput) =>
      withLoadingSpinner(
        (async () => {
          try {
            const palauteFinalValues: PalauteInput = { ...formData, liitteet: [] };
            await Promise.all(
              liitteet.map(async (liite) => {
                if (liite.tiedosto instanceof File) {
                  palauteFinalValues.liitteet?.push(await talletaTiedosto(liite.tiedosto));
                }
              })
            );
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
    [withLoadingSpinner, api, projektiOid, showSuccessMessage, t, onClose, reset, talletaTiedosto]
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
                <p style={{ fontWeight: "bold" }}>{t("common:liitteet")}</p>
                <p>{t("projekti:palautelomake.tuetut_tiedostomuodot_ovat")}</p>
                {!!liitteetWatch.length && (
                  <ContentSpacer className="mb-4">
                    <label>{t("common:valitut_tiedostot")}</label>
                    {liitteetWatch.map((item, index) => (
                      <div key={item.nimi}>
                        <FileDiv>
                          <span>{item.nimi}</span>
                          <IconButton
                            sx={{ justifySelf: "end" }}
                            icon="trash"
                            type="button"
                            onClick={() => {
                              liitteetFieldArray.remove(index);
                            }}
                          />
                        </FileDiv>
                        <ErrorMessage
                          errors={formState.errors}
                          name={`liitteet.${index}.koko`}
                          render={({ message }) => <ErrorSpan sx={{ display: "block" }}>{constructErrorMessage(message)}</ErrorSpan>}
                        />
                        <ErrorMessage
                          errors={formState.errors}
                          name={`liitteet.${index}.tyyppi`}
                          render={({ message }) => <ErrorSpan sx={{ display: "block" }}>{constructErrorMessage(message)}</ErrorSpan>}
                        />
                      </div>
                    ))}
                    <ErrorMessage
                      errors={formState.errors}
                      name={`liitteet`}
                      render={({ message }) => <ErrorSpan sx={{ display: "block" }}>{constructErrorMessage(message)}</ErrorSpan>}
                    />
                  </ContentSpacer>
                )}
                <input
                  className="hidden"
                  id="file-input"
                  type="file"
                  ref={inputRef}
                  multiple
                  accept={allowedFileTypes.join(", ")}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files?.length) {
                      let duplicateLiitteet: File[] = [];
                      Array.from(files)
                        .filter((tiedosto) => {
                          const nameAlreadyExists = liitteetWatch.some((liite) => liite.nimi === tiedosto.name);
                          if (nameAlreadyExists) {
                            duplicateLiitteet.push(tiedosto);
                          }
                          return !nameAlreadyExists;
                        })
                        .forEach((file) =>
                          liitteetFieldArray.append({ nimi: file.name, tiedosto: file, koko: file.size, tyyppi: file.type })
                        );
                      if (duplicateLiitteet.length) {
                        const nimet = joinStringArray(
                          duplicateLiitteet.map((liite) => `'${liite.name}'`),
                          ", ",
                          ` ${t("common:ja")} `
                        );
                        showErrorMessage(
                          t("common:virheet.saman_niminen_liite", {
                            count: duplicateLiitteet.length,
                            nimet,
                          })
                        );
                      }
                    }
                    if (inputRef.current) {
                      // Clear input value so onchange will trigger for the same file
                      inputRef.current.value = "";
                    }
                    useFormReturn.trigger();
                  }}
                />
                <Button
                  onClick={() => {
                    inputRef.current?.click();
                  }}
                  type="button"
                >
                  {t("common:hae_tiedosto")}
                </Button>
              </div>
            </form>
          </FormProvider>
        </DialogContent>
        <DialogActions
          className={isMobile ? "flex-row-reverse justify-between sticky bottom-0 bg-white border-t py-4 z-10 border-gray-light" : ""}
        >
          <Button id={"submit_feedback"} primary onClick={handleSubmit(save)} disabled={!formState.isValid}>
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

const FileDiv = styled("div")({ display: "flex", justifyContent: "space-between", alignItems: "center" });

interface KiitosProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export function KiitosDialogi({ open, onClose, isMobile }: Readonly<KiitosProps>): ReactElement {
  const { t } = useTranslation();
  return (
    <HassuDialog
      PaperProps={isMobile ? { sx: { display: "flex", flexDirection: "column", justifyContent: "space-between" } } : undefined}
      scroll={"paper"}
      open={open}
      title={t("projekti:palautelomake.kiitos_viestista")}
      onClose={onClose}
      maxWidth={"sm"}
      fullScreen={isMobile}
    >
      <DialogContent>
        <p>{t("projekti:palautelomake.olemme_vastaanottaneet_viestisi")}</p>
        <p>{t("projekti:palautelomake.kaikki_viestit_kasitellaan")}</p>
        <p>{t("projekti:palautelomake.jos_toivoit_yhteydenottoa")}</p>
      </DialogContent>
      <DialogActions className={isMobile ? "sticky bottom-0 bg-white border-t py-4 z-10 border-gray-light" : ""}>
        <Button onClick={onClose} primary id="close_thank_you_dialog">
          {t("common:sulje")}
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
