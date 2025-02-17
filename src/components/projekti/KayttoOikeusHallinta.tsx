import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, FieldArrayWithId, useFieldArray, UseFieldArrayRemove, useFormContext } from "react-hook-form";
import { ELY, Kayttaja, KayttajaTyyppi, ProjektiKayttaja, ProjektiKayttajaInput } from "@services/api";
import Button from "@components/button/Button";
import { maxPhoneLength } from "hassu-common/schema/puhelinNumero";
import Section from "@components/layout/Section2";
import { TextFieldWithController } from "@components/form/TextFieldWithController";
import {
  Autocomplete,
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  styled,
  SvgIcon,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import useDebounceCallback from "src/hooks/useDebounceCallback";
import HassuGrid from "@components/HassuGrid";
import ContentSpacer from "@components/layout/ContentSpacer";
import { formatNimi } from "../../util/userUtil";
import useApi from "src/hooks/useApi";
import useTranslation from "next-translate/useTranslation";
import { organisaatioIsEly } from "hassu-common/util/organisaatioIsEly";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { OhjelistaNotification } from "./common/OhjelistaNotification";
import { H2, H3 } from "../Headings";
import { queryMatchesWithFullname } from "common/henkiloSearch/queryMatchesWithFullname";
import { isAorLTunnus } from "hassu-common/util/isAorLTunnus";

export type ProjektiKayttajaFormValue = ProjektiKayttajaInput & { organisaatio?: string | null };

export type FormValues = {
  oid: string;
  kayttoOikeudet: ProjektiKayttajaFormValue[];
  versio: number;
};

type PotentiaalisestiPoistunutKayttaja = Kayttaja & { poistunut?: boolean };

interface Props {
  disableFields?: boolean;
  projektiKayttajat: ProjektiKayttaja[];
  suunnitteluSopimusYhteysHenkilo?: string | undefined;
  projekti: ProjektiLisatiedolla;
  includeTitle: boolean;
  ohjeetOpen: boolean;
  ohjeetOnClose: () => void;
  ohjeetOnOpen: () => void;
}

const getDefaultKayttaja = (): ProjektiKayttajaFormValue => ({
  tyyppi: undefined,
  puhelinnumero: "",
  kayttajatunnus: "",
  organisaatio: "",
  elyOrganisaatio: undefined,
  yleinenYhteystieto: false,
});

function KayttoOikeusHallinta(props: Props) {
  const [initialKayttajat, setInitialKayttajat] = useState<PotentiaalisestiPoistunutKayttaja[]>();
  const api = useApi();

  useEffect(() => {
    let mounted = true;
    async function loadKayttajat(kayttajat: string[]): Promise<PotentiaalisestiPoistunutKayttaja[]> {
      if (kayttajat.length === 0) {
        return [];
      }
      return await api.listUsers({
        kayttajatunnus: kayttajat,
      });
    }
    const getInitialKayttajat = async () => {
      const kayttajat = await loadKayttajat(props.projektiKayttajat.map((kayttaja) => kayttaja.kayttajatunnus));
      const poistuneetKayttajat = props.projektiKayttajat
        .filter((pk) => !kayttajat.some((k) => k.uid === pk.kayttajatunnus))
        .map<PotentiaalisestiPoistunutKayttaja>(({ etunimi, sukunimi, email, kayttajatunnus, puhelinnumero, organisaatio }) => ({
          __typename: "Kayttaja",
          etunimi,
          sukunimi,
          email,
          organisaatio,
          puhelinnumero,
          uid: kayttajatunnus,
          poistunut: true,
        }));
      const kaikkiKayttajat = kayttajat.concat(poistuneetKayttajat);

      if (mounted) {
        setInitialKayttajat(kaikkiKayttajat);
      }
    };
    getInitialKayttajat();
    return () => {
      mounted = false;
    };
  }, [api, props, props.projektiKayttajat]);

  if (!initialKayttajat) {
    return <></>;
  }

  return <KayttoOikeusHallintaFormElements {...props} initialKayttajat={initialKayttajat} />;
}

function KayttoOikeusHallintaFormElements({
  disableFields,
  projektiKayttajat: projektiKayttajatFromApi,
  initialKayttajat,
  suunnitteluSopimusYhteysHenkilo,
  projekti,
  includeTitle,
  ohjeetOpen,
  ohjeetOnClose,
  ohjeetOnOpen,
}: Props & { initialKayttajat: PotentiaalisestiPoistunutKayttaja[] }) {
  const {
    control,
    formState: { errors },
  } = useFormContext<FormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "kayttoOikeudet",
  });

  const { projektiPaallikot, muutHenkilot } = useMemo(
    () =>
      fields?.reduce<{
        projektiPaallikot: FieldArrayWithId<FormValues, "kayttoOikeudet", "id">[];
        muutHenkilot: FieldArrayWithId<FormValues, "kayttoOikeudet", "id">[];
      }>(
        (acc, kayttoOikeus, index) => {
          if (kayttoOikeus.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO) {
            acc.projektiPaallikot[index] = kayttoOikeus;
          } else {
            acc.muutHenkilot[index] = kayttoOikeus;
          }
          return acc;
        },
        { projektiPaallikot: [], muutHenkilot: [] }
      ) || { projektiPaallikot: [], muutHenkilot: [] },
    [fields]
  );

  return (
    <Section gap={8}>
      {includeTitle && (
        <h3 className="vayla-subtitle">
          Projektin henkilöt{" "}
          {!ohjeetOpen && (
            <IconButton onClick={ohjeetOnOpen}>
              <SvgIcon>
                <FontAwesomeIcon icon="info-circle" />
              </SvgIcon>
            </IconButton>
          )}
        </h3>
      )}

      <OhjelistaNotification open={ohjeetOpen} onClose={ohjeetOnClose}>
        <li>
          Käyttöoikeus uudelle henkilölle annetaan lisäämällä uusi henkilötietorivi Lisää uusi -painikkeella. Käyttöoikeus poistetaan
          roskakoripainikkeella.
        </li>
        <li>
          Valitse ‘Yhteystiedot näytetään julkisella puolella projektin yleisissä yhteystiedoissa’, jos haluat henkilön yhteystiedot
          julkaistavan. Kuulutuksissa esitettävät yhteystiedot valitaan erikseen kuulutuksien yhteydessä. Projektipäällikön yhteystiedot
          näytetään aina.
        </li>
        {projekti.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo ? (
          <li>
            Projektipäällikön varahenkilöksi voidaan asettaa henkilö, joka on Väyläviraston tai ELY-keskuksen palveluksessa oleva (tunnus
            muotoa L tai A). Projektipäälliköllä ja varahenkilöllä / -henkilöillä on muita henkilöitä laajemmat katselu- ja
            muokkausoikeudet. Jos et saa asetettua haluamaasi henkilöä varahenkilöksi, ota yhteys pääkäyttäjään.
          </li>
        ) : (
          <li>
            Projektipäälliköllä ja varahenkilöllä / -henkilöillä on muita henkilöitä laajemmat katselu- ja muokkausoikeudet.
            Projektipäälliköllä ja varahenkilöllä on oikeus käsitellä varahenkilöoikeuksia. Ota tarvittaessa yhteys projektipäällikköön tai
            varahenkilöön.
          </li>
        )}
      </OhjelistaNotification>

      {projektiPaallikot.length > 0 && (
        <ContentSpacer gap={8}>
          <ContentSpacer>
            <H2>Projektipäällikkö</H2>
            <p>Projektipäällikkö on haettu Projektivelhosta. Jos haluat vaihtaa projektipäällikön, muutos pitää tehdä Projektivelhoon.</p>
          </ContentSpacer>
          {projektiPaallikot.map((paallikko, index) => {
            const initialKayttaja = initialKayttajat?.find(({ uid }) => uid === paallikko.kayttajatunnus) || null;
            const kayttajaFromApi = projektiKayttajatFromApi.find(({ kayttajatunnus }) => kayttajatunnus === paallikko.kayttajatunnus);
            const muokattavissa = kayttajaFromApi?.muokattavissa === false ? false : true;
            return (
              <UserFields
                disableFields={disableFields}
                index={index}
                projektiKayttajatFromApi={projektiKayttajatFromApi}
                initialKayttaja={initialKayttaja}
                remove={remove}
                key={paallikko.id}
                muokattavissa={muokattavissa}
                isProjektiPaallikko
              />
            );
          })}
        </ContentSpacer>
      )}
      <ContentSpacer gap={8}>
        <ContentSpacer>
          <H3>Muut henkilöt</H3>
        </ContentSpacer>
        {muutHenkilot.map((user, index) => {
          const initialKayttaja = initialKayttajat?.find(({ uid }) => uid === user.kayttajatunnus) || null;
          const kayttajaFromApi = projektiKayttajatFromApi.find(({ kayttajatunnus }) => kayttajatunnus === user.kayttajatunnus);
          const muokattavissa = kayttajaFromApi?.muokattavissa === false ? false : true;
          const isSuunnitteluSopimusYhteysHenkilo =
            !!suunnitteluSopimusYhteysHenkilo && user.kayttajatunnus === suunnitteluSopimusYhteysHenkilo;
          return (
            <UserFields
              disableFields={disableFields}
              index={index}
              initialKayttaja={initialKayttaja}
              projektiKayttajatFromApi={projektiKayttajatFromApi}
              remove={remove}
              key={user.id}
              muokattavissa={muokattavissa}
              isSuunnitteluSopimusYhteysHenkilo={isSuunnitteluSopimusYhteysHenkilo}
            />
          );
        })}
      </ContentSpacer>
      <Button
        onClick={(event) => {
          event.preventDefault();
          append(getDefaultKayttaja());
        }}
        disabled={disableFields}
        type="button"
        id="lisaa_uusi_kayttaja"
      >
        Lisää uusi +
      </Button>
      {(errors.kayttoOikeudet as any)?.message && <p className="text-red pt-3">{(errors.kayttoOikeudet as any)?.message}</p>}
    </Section>
  );
}

interface UserFieldProps {
  disableFields?: boolean;
  initialKayttaja: PotentiaalisestiPoistunutKayttaja | null;
  projektiKayttajatFromApi: ProjektiKayttaja[];
  index: number;
  remove: UseFieldArrayRemove;
  muokattavissa: boolean;
  isProjektiPaallikko?: boolean;
  isSuunnitteluSopimusYhteysHenkilo?: boolean;
}

const UserFields = ({
  index,
  disableFields,
  remove,
  initialKayttaja,
  projektiKayttajatFromApi,
  muokattavissa,
  isProjektiPaallikko,
  isSuunnitteluSopimusYhteysHenkilo,
}: UserFieldProps) => {
  const [kayttaja, setKayttaja] = useState<PotentiaalisestiPoistunutKayttaja | null>(initialKayttaja);

  useEffect(() => {
    setKayttaja(initialKayttaja);
  }, [initialKayttaja]);

  const { t } = useTranslation("common");

  const api = useApi();

  const [loadingKayttajaResults, setLoadingKayttajaResults] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

  const { control, setValue } = useFormContext<FormValues>();

  // Prevent onInputChange's first search from happening when initialKayttaja is given as prop
  const [preventOnInputChange, setPreventOnInputChange] = React.useState(!!initialKayttaja);
  const [options, setOptions] = useState<PotentiaalisestiPoistunutKayttaja[]>(initialKayttaja ? [initialKayttaja] : []);

  const searchAndUpdateKayttajat = useCallback(
    async (hakusana: string) => {
      let mounted = true;
      let users: PotentiaalisestiPoistunutKayttaja[] = [];
      let poistuneetUsers: PotentiaalisestiPoistunutKayttaja[] = [];
      if (hakusana.length >= 3) {
        setLoadingKayttajaResults(true);
        users = await api.listUsers({ hakusana });
        poistuneetUsers = projektiKayttajatFromApi
          .filter((k) => !users.some((u) => u.uid === k.kayttajatunnus))
          .filter((k) => queryMatchesWithFullname(hakusana, k.etunimi, k.sukunimi))
          .map<PotentiaalisestiPoistunutKayttaja>(({ etunimi, sukunimi, email, kayttajatunnus, puhelinnumero, organisaatio }) => ({
            __typename: "Kayttaja",
            etunimi,
            sukunimi,
            email,
            organisaatio,
            puhelinnumero,
            uid: kayttajatunnus,
            poistunut: true,
          }));
      }
      if (mounted) {
        setOptions(users.concat(poistuneetUsers));
        setLoadingKayttajaResults(false);
      }
      return () => (mounted = false);
    },
    [api, projektiKayttajatFromApi]
  );

  const debouncedSearchKayttajat = useDebounceCallback(searchAndUpdateKayttajat, 200);

  const isCurrentKayttajaMissingFromOptions = kayttaja && !options.some((o) => o.uid === kayttaja.uid);

  const [popperOpen, setPopperOpen] = useState(false);
  const closePopper = () => setPopperOpen(false);
  const openPopper = () => setPopperOpen(true);

  const poistettavissa = muokattavissa && !isSuunnitteluSopimusYhteysHenkilo;

  return (
    <ContentSpacer>
      <Stack direction="row">
        <HassuGrid
          sx={{
            gridTemplateColumns: { width: "100%", xs: "1fr", lg: "repeat(3, minmax(max-content, 1fr))" },
          }}
        >
          <Controller
            name={`kayttoOikeudet.${index}.kayttajatunnus`}
            render={({ field: { onChange, name, onBlur, ref }, fieldState }) => (
              <Autocomplete
                options={isCurrentKayttajaMissingFromOptions ? [...options, kayttaja] : options}
                open={popperOpen}
                onOpen={openPopper}
                onClose={closePopper}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Nimi"
                    required
                    error={!!fieldState.error?.message}
                    helperText={fieldState.error?.message}
                    inputRef={ref}
                    name={name}
                    onBlur={onBlur}
                    onKeyDown={(e) => {
                      if (!popperOpen && e.code === "Enter") {
                        openPopper();
                      }
                    }}
                  />
                )}
                loading={loadingKayttajaResults}
                getOptionLabel={formatNimi}
                value={kayttaja}
                disabled={!muokattavissa}
                isOptionEqualToValue={(option, value) => option.uid === value.uid}
                onChange={(_event, newValue) => {
                  setKayttaja(newValue);
                  setValue(`kayttoOikeudet.${index}.organisaatio`, newValue?.organisaatio ?? "");
                  if (!organisaatioIsEly(newValue?.organisaatio)) {
                    setValue(`kayttoOikeudet.${index}.elyOrganisaatio`, undefined);
                  }
                  onChange(newValue?.uid || "");
                }}
                onInputChange={(_event, newInputValue) => {
                  if (preventOnInputChange) {
                    setPreventOnInputChange(false);
                    return;
                  }
                  debouncedSearchKayttajat(newInputValue);
                }}
                renderOption={(props, kayttaja) => {
                  return (
                    <li {...props} key={kayttaja.uid}>
                      {formatNimi(kayttaja)}
                    </li>
                  );
                }}
              />
            )}
          />
          <TextField label="Organisaatio" value={kayttaja?.organisaatio || ""} disabled />
          {organisaatioIsEly(kayttaja?.organisaatio) && (
            <Controller
              control={control}
              name={`kayttoOikeudet.${index}.elyOrganisaatio`}
              render={({ field: { value, onChange, ref, ...fieldProps }, fieldState }) => (
                <FormControl fullWidth>
                  <InputLabel>ELY-keskus *</InputLabel>
                  <Select
                    // Value is always string in the Select component, but "" is undefined on the form
                    value={value || ""}
                    onChange={(event) => {
                      const value = event.target.value || null;
                      onChange(value);
                    }}
                    inputProps={fieldProps}
                    inputRef={ref}
                    label="ELY-keskus *"
                    error={!!fieldState.error}
                    defaultValue={""}
                  >
                    <MenuItem value="">Valitse</MenuItem>
                    {Object.values(ELY).map((ely) => (
                      <MenuItem value={ely} key={ely}>
                        {t(`ely_alue_genetiivi.${ely}`)}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldState.error?.message && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
                </FormControl>
              )}
            />
          )}
          <TextFieldWithController
            label="Puhelinnumero *"
            controllerProps={{ name: `kayttoOikeudet.${index}.puhelinnumero` }}
            inputProps={{ maxLength: maxPhoneLength }}
            disabled={disableFields}
          />
          <TextField label="Sähköpostiosoite *" value={kayttaja?.email || ""} disabled name={`kayttoOikeudet.${index}.sahkoposti`} />
        </HassuGrid>
        {!isMobile && (
          <IconButton
            data-testid={`poista.kayttoOikeudet.${index}`}
            sx={{
              marginTop: 5.5,
              alignSelf: "start",
              visibility: !muokattavissa || isSuunnitteluSopimusYhteysHenkilo ? "hidden" : undefined,
            }}
            onClick={() => {
              if (muokattavissa && !isSuunnitteluSopimusYhteysHenkilo) {
                remove(index);
              }
            }}
            disabled={disableFields || !muokattavissa || isSuunnitteluSopimusYhteysHenkilo}
            size="large"
            type="button"
          >
            <SvgIcon>
              <FontAwesomeIcon icon="trash" />
            </SvgIcon>
          </IconButton>
        )}
      </Stack>
      {kayttaja?.poistunut && <KayttajaPoistunutText muokattavissa={muokattavissa} poistettavissa={poistettavissa} />}
      {!isProjektiPaallikko && kayttaja?.uid && isAorLTunnus(kayttaja?.uid) && (
        <Controller
          name={`kayttoOikeudet.${index}.tyyppi`}
          shouldUnregister
          render={({ field: { value, onChange, ...field } }) => (
            <Box>
              <FormControlLabel
                disabled={!muokattavissa}
                label="Projektipäällikön varahenkilö"
                control={
                  <Checkbox
                    checked={value === KayttajaTyyppi.VARAHENKILO}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      const tyyppi: KayttajaTyyppi | null = checked ? KayttajaTyyppi.VARAHENKILO : null;
                      onChange(tyyppi);
                    }}
                    {...field}
                    name={`kayttoOikeudet.${index}.varahenkiloValinta`}
                  />
                }
              />
            </Box>
          )}
        />
      )}
      {!muokattavissa && !isProjektiPaallikko && (
        <p>
          Tämän henkilön tiedot on haettu Projektivelhosta. Jos haluat vaihtaa tai poistaa tämän henkilön, muutos pitää tehdä
          Projektivelhoon.
        </p>
      )}
      {isSuunnitteluSopimusYhteysHenkilo && muokattavissa && (
        <p>
          Kunnan edustajaksi liitettyä henkilöä ei voi poistaa Projektin henkilöt -sivulta, ennen kuin suunnittelusopimukseen on liitetty
          toinen henkilö.
        </p>
      )}
      <Controller<FormValues>
        name={`kayttoOikeudet.${index}.yleinenYhteystieto`}
        shouldUnregister
        render={({ field: { value, onChange, ...field } }) => (
          <Box>
            <FormControlLabel
              disabled={isProjektiPaallikko || isSuunnitteluSopimusYhteysHenkilo}
              label="Yhteystiedot näytetään julkisella puolella projektin yleisissä yhteystiedoissa."
              control={
                <Checkbox
                  checked={isProjektiPaallikko || isSuunnitteluSopimusYhteysHenkilo ? true : !!value}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    onChange(!!checked);
                  }}
                  {...field}
                />
              }
            />
          </Box>
        )}
      />
      {isMobile && poistettavissa && (
        <Button
          onClick={(event) => {
            event.preventDefault();
            if (muokattavissa) {
              remove(index);
            }
          }}
          endIcon="trash"
          disabled={disableFields || !muokattavissa}
          type="button"
          data-testid={`poista.kayttoOikeudet.${index}`}
        >
          Poista
        </Button>
      )}
    </ContentSpacer>
  );
};

const RedParagraph = styled("p")((theme) => ({ color: theme.theme.palette.error.main }));

function KayttajaPoistunutText(props: { muokattavissa: boolean; poistettavissa: boolean }) {
  const sentences = [
    "Henkilöä ei löytynyt käyttäjähallinnasta.",
    "Henkilön tili voi olla poistunut käytöstä ja henkilö ei siten pääse enää järjestelmään muokkaamaan projektia.",
    !props.muokattavissa && "Tämä henkilö on vaihdettavissa Projektivelhosta.",
    props.poistettavissa && "Jollei henkilön yhteystietoja enää tarvita projektissa, projekti voi poistaa ne.",
    "Ota tarvittaessa yhteyttä tuki.vayliensuunnittelu@vayla.fi.",
  ];

  const message = sentences.filter((str): str is string => !!str).join(" ");

  return <RedParagraph>{message}</RedParagraph>;
}

export default KayttoOikeusHallinta;
