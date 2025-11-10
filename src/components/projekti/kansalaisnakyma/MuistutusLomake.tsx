import { Autocomplete, DialogActions, DialogContent, styled, TextField, Typography, useMediaQuery, useTheme } from "@mui/material";
import React, { ReactElement, useCallback, useMemo, useRef, useState } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import HassuDialog from "@components/HassuDialog";
import HassuGrid from "@components/HassuGrid";
import { useController, useFieldArray, useForm, UseFormProps } from "react-hook-form";
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
import { ErrorSpan } from "@components/form/FormGroup";
import useSnackbars from "src/hooks/useSnackbars";
import Section from "@components/layout/Section2";
import { muistutusSchema } from "src/schemas/nahtavillaoloMuistutus";
import useApi from "src/hooks/useApi";
import Trans from "next-translate/Trans";
import ExtLink from "@components/ExtLink";
import { lataaTiedosto } from "../../../util/fileUtil";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { TextFieldWithController } from "@components/form/TextFieldWithController";

import useSuomifiUser from "src/hooks/useSuomifiUser";
import { H2, H3 } from "@components/Headings";
import ContentSpacer from "@components/layout/ContentSpacer";
import { ErrorMessage } from "@hookform/error-message";
import { allowedFileTypes } from "common/fileValidationSettings";
import lookup from "country-code-lookup";
import { getLocalizedCountryName } from "common/getLocalizedCountryName";
import { joinStringArray } from "hassu-common/util/joinStringArray";
import { useRouter } from "next/router";
import { getSuomiFiLogoutURL } from "@services/userService";
import dayjs from "dayjs";
import ButtonLink from "@components/button/ButtonLink";
import { haehardCodedPalauteKyselyTiedot, PalauteKyselyAvoinna } from "src/util/haePalauteKyselyTiedot";

interface Props {
  nahtavillaolo: NahtavillaoloVaiheJulkaisuJulkinen;
  projekti: ProjektiJulkinen;
  kayttaja?: SuomifiKayttaja;
}

type MuistutusInputForm = Omit<MuistutusInput, "liitteet"> & {
  liitteet: { nimi: string; tiedosto: File; tyyppi: string; koko: number }[];
};

const countryCodes = lookup.countries.map((country) => country.iso2);

const getDefaultFormValues: (kayttaja: SuomifiKayttaja | undefined) => MuistutusInputForm = (kayttaja: SuomifiKayttaja | undefined) => {
  const maa = lookup.byIso(kayttaja?.maakoodi ?? "FI")?.iso2 ?? "FI";
  return {
    etunimi: kayttaja?.etunimi ?? "",
    sukunimi: kayttaja?.sukunimi ?? "",
    katuosoite: kayttaja?.osoite ?? "",
    postinumero: kayttaja?.postinumero ?? "",
    postitoimipaikka: kayttaja?.postitoimipaikka ?? "",
    maa,
    muistutus: "",
    liitteet: [],
    sahkoposti: kayttaja?.email ?? "",
    puhelinnumero: "",
  };
};

export default function MuistutusLomake({ projekti, nahtavillaolo, kayttaja }: Readonly<Props>): ReactElement {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { t, lang } = useTranslation();
  const [kiitosDialogiOpen, setKiitosDialogiOpen] = useState(false);
  const [sessioVanhentunut, setSessioVanhentunut] = useState(false);
  const [epaonnistuiDialogiOpen, setEpaonnistuiDialogiOpen] = useState(false);
  const closeSessioDialog = useCallback(() => {
    setSessioVanhentunut(false);
    router.push(getSuomiFiLogoutURL());
  }, [router]);
  const { data: suomifiUser } = useSuomifiUser();

  const formOptions: UseFormProps<MuistutusInputForm> = {
    resolver: yupResolver(muistutusSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: getDefaultFormValues(suomifiUser),
    context: { suomifiUser },
    shouldUnregister: false,
  };
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const useFormReturn = useForm<MuistutusInputForm>(formOptions);

  const { handleSubmit, control, reset, watch, formState } = useFormReturn;

  const liitteetFieldArray = useFieldArray({ name: "liitteet", control });

  const liitteetWatch = watch("liitteet");

  const api = useApi();

  const getTietosuojaUrl = useCallback(() => {
    if (projekti.velho.suunnittelustaVastaavaViranomainen == SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO) {
      return lang == "sv" ? "https://vayla.fi/sv/trafikledsverket/kontaktuppgifter/dataskyddspolicy" : "https://www.vayla.fi/tietosuoja";
    } else if (projekti.velho.suunnittelustaVastaavaViranomainen?.endsWith("ELY")) {
      return lang == "sv"
        ? "https://www.ely-keskus.fi/sv/tietosuoja-ja-henkilotietojen-kasittely"
        : "https://www.ely-keskus.fi/tietosuoja-ja-henkilotietojen-kasittely";
    } else {
      return lang == "sv"
        ? "https://www.elinvoimakeskus.fi/sv/tietosuoja-ja-henkilotietojen-kasittely"
        : "https://www.elinvoimakeskus.fi/tietosuoja-ja-henkilotietojen-kasittely";
    }
  }, [lang, projekti.velho.suunnittelustaVastaavaViranomainen]);

  const { withLoadingSpinner } = useLoadingSpinner();

  const save = useCallback(
    ({ liitteet, ...formData }: MuistutusInputForm) =>
      withLoadingSpinner(
        (async () => {
          try {
            const muistutusFinalValues: MuistutusInput = { ...formData, liitteet: [] };
            const talletaTiedosto = async (tiedosto: File) => lataaTiedosto(api, tiedosto);

            await Promise.all(
              liitteet.map(async (liite) => {
                if (liite.tiedosto instanceof File) {
                  muistutusFinalValues.liitteet.push(await talletaTiedosto(liite.tiedosto));
                }
              })
            );
            const suomiFiUser = await api.getCurrentSuomifiUser();
            if (suomiFiUser?.suomifiEnabled && !suomiFiUser?.tunnistautunut) {
              setSessioVanhentunut(true);
              return;
            }
            await api.lisaaMuistutus(projekti.oid, muistutusFinalValues);
            showSuccessMessage(t("common:ilmoitukset.tallennus_onnistui"));
            setKiitosDialogiOpen(true);
            reset();
          } catch (e) {
            setEpaonnistuiDialogiOpen(true);
          }
        })()
      ),
    [withLoadingSpinner, api, projekti.oid, showSuccessMessage, t, reset]
  );

  const close = useCallback(() => setKiitosDialogiOpen(false), []);
  const closeEpaonnistui = useCallback(() => setEpaonnistuiDialogiOpen(false), []);

  const inputRef = useRef<HTMLInputElement>(null);

  const {
    field: { ref, onChange, onBlur, name, value },
    fieldState,
  } = useController({ name: "maa", control });

  const [inputValue, setInputValue] = React.useState("");

  const constructErrorMessage = useCallback((msg: string) => t(`common:virheet.${msg}`), [t]);

  const countryCodesSorted = useMemo(
    () =>
      countryCodes.sort((codeA, codeB) => {
        const nameA = getLocalizedCountryName(lang, codeA);
        const nameB = getLocalizedCountryName(lang, codeB);
        return nameA.localeCompare(nameB);
      }),
    [lang]
  );

  const viranomainenText = useMemo(() => {
    const viranomainen = projekti.velho?.suunnittelustaVastaavaViranomainen;
    if (!viranomainen) {
      return "<Viranomaistieto puuttuu>";
    }
    return viranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO
      ? t("common:vaylavirasto")
      : viranomainen && viranomainen.endsWith("ELY")
      ? t("common:ely-keskus")
      : t("common:elinvoimakeskus");
  }, [projekti.velho?.suunnittelustaVastaavaViranomainen, t]);

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
              viranomainen: viranomainenText,
            })}
          </p>
          <p>
            {t(
              `projekti:muistutuslomake.saat_tekemastasi_muistutuksesta_${
                kayttaja?.kayttajaSuomifiViestitEnabled && kayttaja.suomifiViestitEnabled ? "suomifi" : "email"
              }`
            )}
          </p>
          <Trans
            i18nKey="projekti:muistutuslomake.lisatietoja_henkilotietojesi"
            components={{ p: <p />, a: <ExtLink href={getTietosuojaUrl()} /> }}
          />
        </ContentSpacer>
        <H3>{t("projekti:muistutuslomake.muistutuksen_lahettajan_tiedot")}</H3>
        <ContentSpacer gap={8} as="form">
          <HassuStack>
            <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 2]}>
              <TextFieldWithController
                required
                disabled={kayttaja?.suomifiEnabled}
                controllerProps={{ control, name: "etunimi", constructErrorMessage }}
                label={t("common:etunimi")}
              />
              <TextFieldWithController
                disabled={kayttaja?.suomifiEnabled}
                required
                controllerProps={{ control, name: "sukunimi", constructErrorMessage }}
                label={t("common:sukunimi")}
              />
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
                options={countryCodesSorted}
                renderInput={({ inputProps = {}, ...params }) => (
                  <TextField
                    {...params}
                    name={name}
                    label={t("common:maa")}
                    inputProps={{ ref, ...inputProps }}
                    error={!!fieldState.error?.message}
                    helperText={fieldState.error?.message ? constructErrorMessage(fieldState.error.message) : undefined}
                    required
                  />
                )}
                getOptionLabel={(code) => getLocalizedCountryName(lang, code)}
                value={value}
                inputValue={inputValue}
                renderOption={(props, code) => {
                  return (
                    <li {...props} key={code}>
                      {getLocalizedCountryName(lang, code)}
                    </li>
                  );
                }}
                onInputChange={(_event, newInputValue) => {
                  setInputValue(newInputValue);
                }}
                onChange={(_event, newValue) => {
                  onChange(newValue);
                }}
                onBlur={onBlur}
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
          </ContentSpacer>
          <Button className="ml-auto" id="submit_feedback" type="button" disabled={!formState.isValid} primary onClick={handleSubmit(save)}>
            {t("common:laheta")}
          </Button>
        </ContentSpacer>
      </ContentSpacer>
      <KiitosDialogi open={kiitosDialogiOpen} projekti={projekti} nahtavillaolo={nahtavillaolo} onClose={close} isMobile={isMobile} />
      <EpaonnistuiDialogi
        open={epaonnistuiDialogiOpen}
        projekti={projekti}
        nahtavillaolo={nahtavillaolo}
        onClose={closeEpaonnistui}
        isMobile={isMobile}
      />
      <HassuDialog open={sessioVanhentunut} title={t("common:istunto_vanhentunut")} maxWidth="sm" onClose={closeSessioDialog}>
        <DialogContent>
          <p>{t("common:istunto_vanhentunut_teksti")}</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSessioDialog}>{t("common:sulje")}</Button>
        </DialogActions>
      </HassuDialog>
    </Section>
  );
}

const FileDiv = styled("div")({ display: "flex", justifyContent: "space-between", alignItems: "center" });

interface DialogProps {
  open: boolean;
  onClose: () => void;
  nahtavillaolo: NahtavillaoloVaiheJulkaisuJulkinen;
  projekti: ProjektiJulkinen;
  isMobile: boolean;
}

export function KiitosDialogi({ open, onClose, projekti, nahtavillaolo, isMobile }: Readonly<DialogProps>): ReactElement {
  const { t } = useTranslation();
  const kyselyTiedot: PalauteKyselyAvoinna = haehardCodedPalauteKyselyTiedot();
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
  const paattyyPvm = dayjs(nahtavillaolo.muistutusoikeusPaattyyPaiva).endOf("date");
  return (
    <HassuDialog
      PaperProps={isMobile ? { sx: { display: "flex", flexDirection: "column", justifyContent: "space-between" } } : undefined}
      scroll="paper"
      fullScreen={isMobile}
      open={open}
      title={t("projekti:muistutuslomake.kiitos_muistutuksesta")}
      onClose={onClose}
      maxWidth={"sm"}
    >
      <DialogContent>
        <p>
          {t("projekti:muistutuslomake.olemme_vastaanottaneet_viestisi", {
            viranomainen: viranomaisenText,
          })}
        </p>
        <p>
          {t("projekti:muistutuslomake.voit_antaa_muistutuksia", {
            pvm: formatDateTime(paattyyPvm),
          })}
        </p>
        {kyselyTiedot.isActive && (
          <>
            <br></br>
            <SomewhatLargerParagraph>{t("projekti:muistutuslomake.kerro_kayttokokemuksestasi")}</SomewhatLargerParagraph>
            <p>{t("projekti:muistutuslomake.kerro_kayttokokemuksestasi_vastaa_kyselyyn")}</p>
            <p>{t("projekti:muistutuslomake.kerro_kayttokokemuksestasi_saatu_palaute")}</p>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} id="close_kiitos_viestista">
          {t("common:sulje")}
        </Button>
        {kyselyTiedot.isActive && (
          <ButtonLink href={kyselyTiedot.href} target="_blank" primary id="link_kerro_kayttokokemuksesi" endIcon="external-link-alt">
            {t("projekti:muistutuslomake.kerro_kayttokokemuksestasi_linkki")}
          </ButtonLink>
        )}
      </DialogActions>
    </HassuDialog>
  );
}

function EpaonnistuiDialogi({ open, onClose, projekti, isMobile }: Readonly<DialogProps>): ReactElement {
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
      title={t("projekti:muistutuslomake.epaonnistui")}
      onClose={onClose}
      maxWidth={"sm"}
    >
      <DialogContent>
        <p>
          {t("projekti:muistutuslomake.epaonnistui_viesti", {
            viranomainen: viranomaisenText,
          })}
        </p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} primary id="close_epaonnistui">
          {t("common:sulje")}
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}

const SomewhatLargerParagraph = styled("p")({ fontSize: "1.125rem" });
