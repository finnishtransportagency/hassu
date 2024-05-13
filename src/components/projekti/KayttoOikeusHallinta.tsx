import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Controller, FieldArrayWithId, useFieldArray, UseFieldArrayRemove, useFormContext } from "react-hook-form";
import { ELY, Kayttaja, KayttajaTyyppi, ProjektiKayttaja, ProjektiKayttajaInput, TallennaProjektiInput } from "@services/api";
import Button from "@components/button/Button";
import { maxPhoneLength } from "src/schemas/puhelinNumero";
import Section from "@components/layout/Section2";
import { isAorL } from "backend/src/util/userUtil";
import { TextFieldWithController } from "@components/form/TextFieldWithController";
import {
  Autocomplete,
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
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
import { organisaatioIsEly } from "backend/src/util/organisaatioIsEly";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { OhjelistaNotification } from "./common/OhjelistaNotification";
import { ProjektiPageLayoutContext } from "./ProjektiPageLayout";

// Extend TallennaProjektiInput by making the field nonnullable and required
type RequiredFields = Pick<TallennaProjektiInput, "kayttoOikeudet">;
type RequiredInputValues = Required<{
  [K in keyof RequiredFields]: NonNullable<RequiredFields[K]>;
}>;

interface Props {
  disableFields?: boolean;
  onKayttajatUpdate: (kayttajat: ProjektiKayttajaInput[]) => void;
  projektiKayttajat: ProjektiKayttaja[];
  suunnitteluSopimusYhteysHenkilo?: string | undefined;
  projekti: ProjektiLisatiedolla;
  includeTitle: boolean;
}

export const defaultKayttaja: ProjektiKayttajaInput = {
  tyyppi: undefined,
  puhelinnumero: "",
  kayttajatunnus: "",
};

function KayttoOikeusHallinta(props: Props) {
  const [initialKayttajat, setInitialKayttajat] = useState<Kayttaja[]>();
  const api = useApi();

  useEffect(() => {
    let mounted = true;
    async function loadKayttajat(kayttajat: string[]): Promise<Kayttaja[]> {
      if (kayttajat.length === 0) {
        return [];
      }
      return await api.listUsers({
        kayttajatunnus: kayttajat,
      });
    }
    const getInitialKayttajat = async () => {
      const kayttajat = await loadKayttajat(props.projektiKayttajat.map((kayttaja) => kayttaja.kayttajatunnus));
      if (mounted) {
        setInitialKayttajat(kayttajat);
      }
    };
    getInitialKayttajat();
    return () => {
      mounted = false;
    };
  }, [api, props.projektiKayttajat]);

  if (!initialKayttajat) {
    return <></>;
  }

  return <KayttoOikeusHallintaFormElements {...props} initialKayttajat={initialKayttajat} />;
}

function KayttoOikeusHallintaFormElements({
  disableFields,
  onKayttajatUpdate,
  projektiKayttajat: projektiKayttajatFromApi,
  initialKayttajat,
  suunnitteluSopimusYhteysHenkilo,
  projekti,
  includeTitle,
}: Props & { initialKayttajat: Kayttaja[] }) {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<RequiredInputValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "kayttoOikeudet",
  });

  const { projektiPaallikot, muutHenkilot } = useMemo(
    () =>
      fields?.reduce<{
        projektiPaallikot: FieldArrayWithId<RequiredInputValues, "kayttoOikeudet", "id">[];
        muutHenkilot: FieldArrayWithId<RequiredInputValues, "kayttoOikeudet", "id">[];
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

  const kayttoOikeudet = watch("kayttoOikeudet");

  useEffect(() => {
    onKayttajatUpdate(kayttoOikeudet || []);
  }, [kayttoOikeudet, onKayttajatUpdate]);

  const [ohjeetOpen, setOhjeetOpen] = useState(() => {
    const savedValue = localStorage.getItem("kayttoOikeusOhjeet");
    const isOpen = savedValue ? savedValue.toLowerCase() !== "false" : true;
    return isOpen;
  });
  const ohjeetOnClose = useCallback(() => {
    setOhjeetOpen(false);
    localStorage.setItem("kayttoOikeusOhjeet", "false");
  }, []);

  return (
    <Section gap={8}>
      {includeTitle && <h3 className="vayla-subtitle">Projektin henkilöt</h3>}

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
            <h4 className="vayla-small-title">Projektipäällikkö</h4>
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
          <h4 className="vayla-small-title">Muut henkilöt</h4>
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
          append(defaultKayttaja);
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
  initialKayttaja: Kayttaja | null;
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
  muokattavissa,
  isProjektiPaallikko,
  isSuunnitteluSopimusYhteysHenkilo,
}: UserFieldProps) => {
  const [kayttaja, setKayttaja] = useState<Kayttaja | null>(initialKayttaja);

  useEffect(() => {
    setKayttaja(initialKayttaja);
  }, [initialKayttaja]);

  const { t } = useTranslation("common");

  const api = useApi();

  const [loadingKayttajaResults, setLoadingKayttajaResults] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

  const { control, setValue } = useFormContext<RequiredInputValues>();

  // Prevent onInputChange's first search from happening when initialKayttaja is given as prop
  const [preventOnInputChange, setPreventOnInputChange] = React.useState(!!initialKayttaja);
  const [options, setOptions] = useState<Kayttaja[]>(initialKayttaja ? [initialKayttaja] : []);

  const searchAndUpdateKayttajat = useCallback(
    async (hakusana: string) => {
      let mounted = true;
      let users: Kayttaja[] = [];
      if (hakusana.length >= 3) {
        setLoadingKayttajaResults(true);
        users = await api.listUsers({ hakusana });
      }
      if (mounted) {
        setOptions(users);
        setLoadingKayttajaResults(false);
      }
      return () => (mounted = false);
    },
    [api]
  );

  const debouncedSearchKayttajat = useDebounceCallback(searchAndUpdateKayttajat, 200);

  const isCurrentKayttajaMissingFromOptions = kayttaja && !options.some((o) => o.uid === kayttaja.uid);

  const [popperOpen, setPopperOpen] = useState(false);
  const closePopper = () => setPopperOpen(false);
  const openPopper = () => setPopperOpen(true);

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
                  <InputLabel>ELY-keskus</InputLabel>
                  <Select
                    // Value is always string in the Select component, but "" is undefined on the form
                    value={value || ""}
                    onChange={(event) => {
                      const value = event.target.value || null;
                      onChange(value);
                    }}
                    inputProps={fieldProps}
                    inputRef={ref}
                    label="ELY-keskus"
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
      {!isProjektiPaallikko && kayttaja?.uid && isAorL(kayttaja?.uid) && (
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
      <Controller<RequiredInputValues>
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
      {!!muokattavissa && isMobile && !isSuunnitteluSopimusYhteysHenkilo && (
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

export default KayttoOikeusHallinta;
