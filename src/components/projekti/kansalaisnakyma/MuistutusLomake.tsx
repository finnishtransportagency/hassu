import { Autocomplete, DialogActions, DialogContent, TextField, Typography } from "@mui/material";
import React, { ReactElement, useCallback, useMemo, useState } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import HassuDialog from "@components/HassuDialog";
import HassuGrid from "@components/HassuGrid";
import { Controller, useController, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import useTranslation from "next-translate/useTranslation";
import {
  MuistutusInput,
  NahtavillaoloVaiheJulkaisuJulkinen,
  ProjektiJulkinen,
  SuomifiKayttaja,
  SuunnittelustaVastaavaViranomainen,
} from "@services/api";
import { formatDateTime } from "hassu-common/util/dateUtils";
import IconButton from "@components/button/IconButton";
import FormGroup from "@components/form/FormGroup";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import Section from "@components/layout/Section2";
import { muistutusSchema } from "src/schemas/nahtavillaoloMuistutus";
import useApi from "src/hooks/useApi";
import Trans from "next-translate/Trans";
import ExtLink from "@components/ExtLink";
import { allowedUploadFileTypes } from "hassu-common/allowedUploadFileTypes";
import { lataaTiedosto } from "../../../util/fileUtil";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { TextFieldWithController } from "@components/form/TextFieldWithController";
import countries from "i18n-iso-countries";

import useSuomifiUser from "src/hooks/useSuomifiUser";
import { H2, H3 } from "@components/Headings";
import ContentSpacer from "@components/layout/ContentSpacer";

interface Props {
  nahtavillaolo: NahtavillaoloVaiheJulkaisuJulkinen;
  projekti: ProjektiJulkinen;
  kayttaja?: SuomifiKayttaja;
}

interface MuistutusFormInput {
  katuosoite: string;
  postitoimipaikka: string;
  postinumero: string;
  sahkoposti?: string;
  maa: string;
  puhelinnumero: string;
  muistutus: string;
  liite: string | null;
}

const countryCodes = Object.keys(countries.getNumericCodes());
const FINLAND_COUNTRYCODE = "246";

export default function MuistutusLomake({ projekti, nahtavillaolo, kayttaja }: Props): ReactElement {
  const { t, lang } = useTranslation();

  const [tiedosto, setTiedosto] = useState<File | undefined>(undefined);
  const [kiitosDialogiOpen, setKiitosDialogiOpen] = useState(false);
  const [tiedostoLiianSuuri, setTiedostoLiianSuuri] = useState(false);

  const { data: suomifiUser } = useSuomifiUser();

  const newDefaultValues: MuistutusFormInput = useMemo(() => {
    const input: MuistutusFormInput = {
      katuosoite: kayttaja?.osoite ?? "",
      postinumero: kayttaja?.postinumero ?? "",
      postitoimipaikka: kayttaja?.postitoimipaikka ?? "",
      maa: kayttaja?.maakoodi ?? FINLAND_COUNTRYCODE,
      muistutus: "",
      liite: null,
      puhelinnumero: "",
    };
    if (kayttaja?.suomifiEnabled) {
      input.sahkoposti = kayttaja?.email ?? "";
    }
    return input;
  }, [kayttaja?.email, kayttaja?.maakoodi, kayttaja?.osoite, kayttaja?.postinumero, kayttaja?.postitoimipaikka, kayttaja?.suomifiEnabled]);
  const formOptions: UseFormProps<MuistutusFormInput> = {
    resolver: yupResolver(muistutusSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: newDefaultValues,
    context: { suomifiUser },
  };
  const { showSuccessMessage } = useSnackbars();
  const useFormReturn = useForm<MuistutusFormInput>(formOptions);

  const {
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
    (formData: MuistutusFormInput) =>
      withLoadingSpinner(
        (async () => {
          try {
            const muistutusFinalValues: MuistutusInput = { ...formData, liite: null };
            if (tiedosto) {
              muistutusFinalValues.liite = await talletaTiedosto(tiedosto);
            }
            (Object.keys(muistutusFinalValues) as Array<keyof MuistutusInput>).forEach((key) => {
              if (!muistutusFinalValues[key]) {
                delete muistutusFinalValues[key];
              }
            });
            await api.lisaaMuistutus(projekti.oid, muistutusFinalValues);
            showSuccessMessage(t("common:ilmoitukset.tallennus_onnistui"));
            setKiitosDialogiOpen(true);
            reset();
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
        })()
      ),
    [withLoadingSpinner, tiedosto, api, projekti.oid, showSuccessMessage, t, reset, talletaTiedosto]
  );

  const close = useCallback(() => setKiitosDialogiOpen(false), []);

  const {
    field: { ref, onChange, onBlur, name, value },
    fieldState,
  } = useController({ name: "maa", control });

  const [inputValue, setInputValue] = React.useState("");

  const constructErrorMessage = useCallback((msg) => t(`common:virheet.${msg}`), [t]);

  return (
    <Section noDivider>
      <H2>{t("projekti:muistutuslomake.jata_muistutus")}</H2>
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
          <p>
            {t("projekti:muistutuslomake.viranomainen_tarvitsee", {
              viranomainen: projekti.velho?.suunnittelustaVastaavaViranomainen
                ? projekti.velho?.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO
                  ? t("common:vaylavirasto")
                  : t("common:ely-keskus")
                : "<Viranomaistieto puuttuu>",
            })}
          </p>
          <p>{t(`projekti:muistutuslomake.saat_tekemastasi_muistutuksesta_${kayttaja?.suomifiEnabled ? "suomifi" : "email"}`)}</p>
          <Trans
            i18nKey="projekti:muistutuslomake.lisatietoja_henkilotietojesi"
            components={{ p: <p />, a: <ExtLink href={getTietosuojaUrl()} /> }}
          />
        </ContentSpacer>
        <H3>{t("projekti:muistutuslomake.muistutuksen_lahettajan_tiedot")}</H3>
        <ContentSpacer gap={8} as="form">
          <HassuStack>
            <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 2]}>
              <TextField disabled name="etunimi" value={kayttaja?.etunimi ?? ""} label={t("common:etunimi")} />
              <TextField disabled name="sukunimi" value={kayttaja?.sukunimi ?? ""} label={t("common:sukunimi")} />
              <TextFieldWithController
                required
                controllerProps={{ control, name: "katuosoite", constructErrorMessage }}
                label={t("common:katuosoite")}
              />
              <TextFieldWithController
                required
                controllerProps={{ control, name: "postinumero", constructErrorMessage }}
                label={t("common:postinumero")}
              />
              <TextFieldWithController
                required
                controllerProps={{ control, name: "postitoimipaikka", constructErrorMessage }}
                label={t("common:postitoimipaikka")}
              />
              <Autocomplete
                options={countryCodes}
                renderInput={({ inputProps = {}, ...params }) => {
                  return (
                    <TextField
                      {...params}
                      name={name}
                      label={t("common:maa")}
                      inputProps={{ ref, ...inputProps }}
                      error={!!fieldState.error?.message}
                      helperText={fieldState.error?.message ? constructErrorMessage(fieldState.error.message) : undefined}
                      required
                    />
                  );
                }}
                getOptionLabel={(option) => countries.getName(option, lang) ?? option}
                value={value}
                inputValue={inputValue}
                onInputChange={(_event, newInputValue) => {
                  setInputValue(newInputValue);
                }}
                onChange={(_event, newValue) => {
                  onChange(newValue);
                }}
                onBlur={onBlur}
              />
              {!kayttaja?.suomifiEnabled && (
                <TextFieldWithController
                  controllerProps={{ control, name: "sahkoposti", constructErrorMessage }}
                  label={t("common:sahkoposti")}
                />
              )}
            </HassuGrid>
          </HassuStack>
          <hr />
          <ContentSpacer>
            <H3>{t("projekti:muistutuslomake.muistutus")}</H3>
            <p>{t("projekti:muistutuslomake.ala_kirjoita")}</p>
            <TextFieldWithController
              label={t("projekti:muistutuslomake.muistutus")}
              required
              minRows={3}
              maxRows={13}
              controllerProps={{ name: "muistutus", control, constructErrorMessage }}
              fullWidth
              multiline
              showCounter
            />
          </ContentSpacer>
          <ContentSpacer>
            <Typography sx={{ fontWeight: 700 }}>{t("projekti:muistutuslomake.muistutuksen_liitteet")}</Typography>
            <p>{t("projekti:muistutuslomake.tuetut_tiedostomuodot_ovat")}</p>
            {tiedosto ? (
              <FormGroup
                label={t("common:valittu_tiedosto")}
                errorMessage={errors?.liite?.message ? t(`common:virheet.${errors.liite.message}`) : ""}
              >
                <HassuStack direction="row">
                  <div style={{ marginTop: "auto", marginBottom: "auto" }}>
                    <div>{tiedosto.name}</div>
                    {tiedostoLiianSuuri && <div style={{ color: "red", fontWeight: "bold" }}>{t("common:tiedosto_on_liian_suuri")}</div>}
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
                onClick={() => {
                  document.getElementById("file-input")?.click();
                }}
                type="button"
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
                  accept={allowedUploadFileTypes.join(", ")}
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
          </ContentSpacer>
          <Button className="ml-auto" id="submit_feedback" type="button" primary onClick={handleSubmit(save)} disabled={tiedostoLiianSuuri}>
            {t("common:laheta")}
          </Button>
        </ContentSpacer>
      </ContentSpacer>
      <KiitosDialogi open={kiitosDialogiOpen} projekti={projekti} nahtavillaolo={nahtavillaolo} onClose={close} />
    </Section>
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
