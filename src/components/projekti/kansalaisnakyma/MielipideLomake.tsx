// Contains code generated or recommended by Amazon Q
import { DialogActions, DialogContent, styled, Typography, useMediaQuery, useTheme } from "@mui/material";
import React, { ReactElement, useCallback, useMemo, useRef, useState } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import HassuDialog from "@components/HassuDialog";
import HassuGrid from "@components/HassuGrid";
import { useController, useFieldArray, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import useTranslation from "next-translate/useTranslation";
import { MielipideInput, ProjektiJulkinen, SuunnittelustaVastaavaViranomainen } from "@services/api";
import { formatDateTime } from "hassu-common/util/dateUtils";
import dayjs from "dayjs";
import Trans from "next-translate/Trans";
import ExtLink from "@components/ExtLink";
import { getTietosuojaUrl } from "src/util/tietosuojaUtil";
import IconButton from "@components/button/IconButton";
import { ErrorSpan } from "@components/form/FormGroup";
import useSnackbars from "src/hooks/useSnackbars";
import Section from "@components/layout/Section2";
import { mielipideSchema } from "src/schemas/nahtavillaoloMielipide";
import useApi from "src/hooks/useApi";
import { lataaTiedosto } from "../../../util/fileUtil";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { TextFieldWithController } from "@components/form/TextFieldWithController";
import { H2, H3 } from "@components/Headings";
import ContentSpacer from "@components/layout/ContentSpacer";
import { ErrorMessage } from "@hookform/error-message";
import { allowedFileTypesKansalaisille } from "common/fileValidationSettings";
import { joinStringArray } from "hassu-common/util/joinStringArray";
import { Autocomplete, TextField } from "@mui/material";
import lookup from "country-code-lookup";
import { getLocalizedCountryName } from "common/getLocalizedCountryName";

interface Props {
  projekti: ProjektiJulkinen;
  mielipideoikeusPaattyyPaiva?: string | null;
}

type MielipideInputForm = Omit<MielipideInput, "liitteet"> & {
  liitteet: { nimi: string; tiedosto: File; tyyppi: string; koko: number }[];
};

const countryCodes = lookup.countries.map((country) => country.iso2);

const defaultFormValues: MielipideInputForm = {
  mielipide: "",
  etunimi: "",
  sukunimi: "",
  lahiosoite: "",
  postinumero: "",
  postitoimipaikka: "",
  maa: "FI",
  sahkoposti: "",
  puhelinnumero: "",
  liitteet: [],
};

export default function MielipideLomake({ projekti, mielipideoikeusPaattyyPaiva }: Readonly<Props>): ReactElement {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { t, lang } = useTranslation();
  const [kiitosDialogiOpen, setKiitosDialogiOpen] = useState(false);
  const [epaonnistuiDialogiOpen, setEpaonnistuiDialogiOpen] = useState(false);

  const formOptions: UseFormProps<MielipideInputForm> = {
    resolver: yupResolver(mielipideSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: defaultFormValues,
    shouldUnregister: false,
  };

  const { showErrorMessage } = useSnackbars();
  const useFormReturn = useForm<MielipideInputForm>(formOptions);
  const { handleSubmit, control, reset, watch, formState } = useFormReturn;

  const liitteetFieldArray = useFieldArray({ name: "liitteet", control });
  const liitteetWatch = watch("liitteet");

  const {
    field: { ref, onChange: onMaaChange, onBlur: onMaaBlur, name: maaName, value: maaValue },
    fieldState: maaFieldState,
  } = useController({ name: "maa", control });
  const [maaInputValue, setMaaInputValue] = React.useState("");

  const countryCodesSorted = useMemo(
    () =>
      countryCodes.sort((codeA, codeB) => {
        const nameA = getLocalizedCountryName(lang, codeA);
        const nameB = getLocalizedCountryName(lang, codeB);
        return nameA.localeCompare(nameB);
      }),
    [lang]
  );

  const api = useApi();
  const { withLoadingSpinner } = useLoadingSpinner();

  const constructErrorMessage = useCallback((msg: string) => t(`common:virheet.${msg}`), [t]);

  const save = useCallback(
    ({ liitteet, ...formData }: MielipideInputForm) =>
      withLoadingSpinner(
        (async () => {
          try {
            const mielipidefinalValues: MielipideInput = { ...formData, liitteet: [] };
            const talletaTiedosto = async (tiedosto: File) => lataaTiedosto(api, tiedosto, false);

            await Promise.all(
              liitteet.map(async (liite) => {
                if (liite.tiedosto instanceof File) {
                  mielipidefinalValues.liitteet!.push(await talletaTiedosto(liite.tiedosto));
                }
              })
            );
            await api.lisaaMielipide(projekti.oid, mielipidefinalValues);
            setKiitosDialogiOpen(true);
            reset();
          } catch (e) {
            setEpaonnistuiDialogiOpen(true);
          }
        })()
      ),
    [withLoadingSpinner, api, projekti.oid, reset]
  );

  const close = useCallback(() => setKiitosDialogiOpen(false), []);
  const closeEpaonnistui = useCallback(() => setEpaonnistuiDialogiOpen(false), []);

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Section noDivider>
      <H2>{t("projekti:mielipidelomake.jata_mielipide")}</H2>
      <ContentSpacer
        sx={{
          backgroundColor: "#F8F8F8",
          paddingLeft: { xs: 4, md: 12 },
          paddingRight: { xs: 4, md: 12 },
          paddingBottom: { xs: 4, md: 7 },
          paddingTop: { xs: 4, md: 7 },
        }}
        gap={7}
      >
        <ContentSpacer>
          <p>{t("projekti:mielipidelomake.mielipide_info")}</p>
          <Trans
            i18nKey="projekti:mielipidelomake.lisatietoja_henkilotietojesi"
            components={{ p: <p />, a: <ExtLink href={getTietosuojaUrl(projekti.velho.suunnittelustaVastaavaViranomainen, lang)} /> }}
          />
        </ContentSpacer>
        <H3>{t("projekti:mielipidelomake.mielipiteen_lahettajan_tiedot")}</H3>
        <p>{t("projekti:mielipidelomake.yhteystiedot_vapaaehtoisia")}</p>
        <ContentSpacer gap={8} as="form">
          <HassuStack>
            <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 2]}>
              <TextFieldWithController controllerProps={{ control, name: "etunimi", constructErrorMessage }} label={t("common:etunimi")} />
              <TextFieldWithController
                controllerProps={{ control, name: "sukunimi", constructErrorMessage }}
                label={t("common:sukunimi")}
              />
              <TextFieldWithController
                controllerProps={{ control, name: "lahiosoite", constructErrorMessage }}
                label={t("common:katuosoite")}
              />
              <TextFieldWithController
                controllerProps={{ control, name: "postinumero", constructErrorMessage }}
                label={t("common:postinumero")}
              />
              <TextFieldWithController
                controllerProps={{ control, name: "postitoimipaikka", constructErrorMessage }}
                label={t("common:postitoimipaikka")}
              />
              <Autocomplete
                options={countryCodesSorted}
                renderInput={({ inputProps = {}, ...params }) => (
                  <TextField
                    {...params}
                    name={maaName}
                    label={t("common:maa")}
                    inputProps={{ ref, ...inputProps }}
                    error={!!maaFieldState.error?.message}
                    helperText={maaFieldState.error?.message ? constructErrorMessage(maaFieldState.error.message) : undefined}
                  />
                )}
                getOptionLabel={(code) => getLocalizedCountryName(lang, code)}
                value={maaValue}
                inputValue={maaInputValue}
                renderOption={(props, code) => (
                  <li {...props} key={code}>
                    {getLocalizedCountryName(lang, code)}
                  </li>
                )}
                onInputChange={(_event, newInputValue) => setMaaInputValue(newInputValue)}
                onChange={(_event, newValue) => onMaaChange(newValue)}
                onBlur={onMaaBlur}
              />
              <TextFieldWithController
                controllerProps={{ control, name: "sahkoposti", constructErrorMessage }}
                label={t("common:sahkoposti")}
              />
              <TextFieldWithController
                controllerProps={{ control, name: "puhelinnumero", constructErrorMessage }}
                label={t("common:puhelinnumero")}
              />
            </HassuGrid>
          </HassuStack>
          <hr />
          <ContentSpacer>
            <H3>{t("projekti:mielipidelomake.mielipide")}</H3>
            <p>{t("projekti:mielipidelomake.ala_kirjoita")}</p>
            <TextFieldWithController
              label={t("projekti:mielipidelomake.mielipide")}
              required
              minRows={3}
              maxRows={13}
              controllerProps={{ name: "mielipide", control, constructErrorMessage }}
              fullWidth
              multiline
              showCounter
            />
          </ContentSpacer>
          <ContentSpacer>
            <Typography sx={{ fontWeight: 700 }}>{t("projekti:mielipidelomake.mielipiteen_liitteet")}</Typography>
            <p>{t("projekti:mielipidelomake.tuetut_tiedostomuodot_ovat")}</p>
            {!!liitteetWatch.length && (
              <ContentSpacer>
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
              </ContentSpacer>
            )}
            <input
              className="hidden"
              id="file-input-mielipide"
              type="file"
              ref={inputRef}
              multiple
              accept={allowedFileTypesKansalaisille.join(", ")}
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
                    .forEach((file) => liitteetFieldArray.append({ nimi: file.name, tiedosto: file, koko: file.size, tyyppi: file.type }));
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
          </ContentSpacer>
          <Button
            className="ml-auto"
            id="submit_mielipide"
            type="button"
            disabled={!formState.isValid}
            primary
            onClick={handleSubmit(save)}
          >
            {t("common:laheta")}
          </Button>
        </ContentSpacer>
      </ContentSpacer>
      <KiitosDialogi
        open={kiitosDialogiOpen}
        onClose={close}
        isMobile={isMobile}
        mielipideoikeusPaattyyPaiva={mielipideoikeusPaattyyPaiva}
        projekti={projekti}
      />
      <EpaonnistuiDialogi open={epaonnistuiDialogiOpen} onClose={closeEpaonnistui} isMobile={isMobile} projekti={projekti} />
    </Section>
  );
}

const FileDiv = styled("div")({ display: "flex", justifyContent: "space-between", alignItems: "center" });

interface KiitosDialogiProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  mielipideoikeusPaattyyPaiva?: string | null;
  projekti: ProjektiJulkinen;
}

function KiitosDialogi({ open, onClose, isMobile, mielipideoikeusPaattyyPaiva, projekti }: Readonly<KiitosDialogiProps>): ReactElement {
  const { t } = useTranslation();
  const paattyyPvm = mielipideoikeusPaattyyPaiva ? dayjs(mielipideoikeusPaattyyPaiva).endOf("date") : null;
  const viranomaisenText = useMemo(() => {
    const viranomainen = projekti.velho?.suunnittelustaVastaavaViranomainen;
    if (!viranomainen) {
      return "<Viranomaistieto puuttuu>";
    }
    return viranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO
      ? t("common:vaylaviraston")
      : viranomainen && viranomainen.endsWith("ELY")
      ? t("common:ely-keskuksen")
      : t("common:elinvoimakeskuksen");
  }, [projekti.velho?.suunnittelustaVastaavaViranomainen, t]);
  return (
    <HassuDialog
      PaperProps={isMobile ? { sx: { display: "flex", flexDirection: "column", justifyContent: "space-between" } } : undefined}
      scroll="paper"
      fullScreen={isMobile}
      open={open}
      title={t("projekti:mielipidelomake.kiitos_mielipiteesta")}
      onClose={onClose}
      maxWidth={"sm"}
    >
      <DialogContent>
        <p>{t("projekti:mielipidelomake.olemme_vastaanottaneet_mielipiteesi", { viranomainen: viranomaisenText })}</p>
        {paattyyPvm && (
          <p>
            {t("projekti:mielipidelomake.voit_antaa_mielipiteita", {
              pvm: formatDateTime(paattyyPvm),
            })}
          </p>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} id="close_kiitos_mielipiteesta">
          {t("common:sulje")}
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}

interface EpaonnistuiDialogiProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  projekti: ProjektiJulkinen;
}

function EpaonnistuiDialogi({ open, onClose, isMobile, projekti }: Readonly<EpaonnistuiDialogiProps>): ReactElement {
  const { t } = useTranslation();
  const viranomaisenText = useMemo(() => {
    const viranomainen = projekti.velho?.suunnittelustaVastaavaViranomainen;
    if (!viranomainen) {
      return "<Viranomaistieto puuttuu>";
    }
    return viranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO
      ? t("common:vaylaviraston")
      : viranomainen && viranomainen.endsWith("ELY")
      ? t("common:ely-keskuksen")
      : t("common:elinvoimakeskuksen");
  }, [projekti.velho?.suunnittelustaVastaavaViranomainen, t]);
  return (
    <HassuDialog
      PaperProps={isMobile ? { sx: { display: "flex", flexDirection: "column", justifyContent: "space-between" } } : undefined}
      scroll="paper"
      fullScreen={isMobile}
      open={open}
      title={t("projekti:mielipidelomake.epaonnistui")}
      onClose={onClose}
      maxWidth={"sm"}
    >
      <DialogContent>
        <p>{t("projekti:mielipidelomake.epaonnistui_viesti", { viranomainen: viranomaisenText })}</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} primary id="close_epaonnistui_mielipide">
          {t("common:sulje")}
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
