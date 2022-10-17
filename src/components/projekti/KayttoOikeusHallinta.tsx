import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, FieldArrayWithId, useFieldArray, UseFieldArrayRemove, useFormContext } from "react-hook-form";
import { api, Kayttaja, KayttajaTyyppi, ProjektiKayttaja, ProjektiKayttajaInput, TallennaProjektiInput } from "@services/api";
import Button from "@components/button/Button";
import { maxPhoneLength } from "src/schemas/puhelinNumero";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import { isAorL } from "backend/src/util/userUtil";
import { TextFieldWithController } from "@components/form/TextFieldWithController";
import { Autocomplete, TextField, Checkbox, FormControlLabel, useTheme, useMediaQuery, IconButton, SvgIcon, Stack } from "@mui/material";
import useDebounceCallback from "src/hooks/useDebounceCallback";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Extend TallennaProjektiInput by making the field nonnullable and required
type RequiredFields = Pick<TallennaProjektiInput, "kayttoOikeudet">;
type RequiredInputValues = Required<{
  [K in keyof RequiredFields]: NonNullable<RequiredFields[K]>;
}>;

interface Props {
  disableFields?: boolean;
  onKayttajatUpdate: (kayttajat: ProjektiKayttajaInput[]) => void;
  projektiKayttajat: ProjektiKayttaja[];
}

const getKayttajaNimi = (k: Kayttaja | null | undefined) => {
  return (k && `${k.sukuNimi}, ${k.etuNimi}`) || "";
};

export const defaultKayttaja: ProjektiKayttajaInput = {
  tyyppi: undefined,
  puhelinnumero: "",
  kayttajatunnus: "",
};

function KayttoOikeusHallinta(props: Props) {
  const [initialKayttajat, setInitialKayttajat] = useState<Kayttaja[]>();
  useEffect(() => {
    let mounted = true;
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
  }, [props.projektiKayttajat]);

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

  return (
    <Section>
      {projektiPaallikot.length > 0 && (
        <SectionContent>
          <h5 className="vayla-paragraph">Projektipäällikkö</h5>
          <p>Projektipäällikö on haettu Projektivelhosta. Jos haluat vaihtaa projektipäällikön, muutos pitää tehdä Projektivelhoon.</p>
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
        </SectionContent>
      )}
      <SectionContent largeGaps>
        <SectionContent>
          <h5 className="vayla-subtitle">Muut henkilöt</h5>
        </SectionContent>
        {muutHenkilot.map((user, index) => {
          const initialKayttaja = initialKayttajat?.find(({ uid }) => uid === user.kayttajatunnus) || null;
          const kayttajaFromApi = projektiKayttajatFromApi.find(({ kayttajatunnus }) => kayttajatunnus === user.kayttajatunnus);
          const muokattavissa = kayttajaFromApi?.muokattavissa === false ? false : true;
          return (
            <UserFields
              disableFields={disableFields}
              index={index}
              initialKayttaja={initialKayttaja}
              remove={remove}
              key={user.id}
              muokattavissa={muokattavissa}
            />
          );
        })}
      </SectionContent>
      <Button
        onClick={(event) => {
          event.preventDefault();
          append(defaultKayttaja);
        }}
        disabled={disableFields}
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
}

const UserFields = ({ index, disableFields, remove, initialKayttaja, muokattavissa, isProjektiPaallikko }: UserFieldProps) => {
  const [kayttaja, setKayttaja] = useState<Kayttaja | null>(initialKayttaja);

  useEffect(() => {
    setKayttaja(initialKayttaja);
  }, [initialKayttaja]);

  const [loadingKayttajaResults, setLoadingKayttajaResults] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

  // Prevent onInputChange's first search from happening when initialKayttaja is given as prop
  const [preventOnInputChange, setPreventOnInputChange] = React.useState(!!initialKayttaja);
  const [options, setOptions] = useState<Kayttaja[]>(initialKayttaja ? [initialKayttaja] : []);

  const searchAndUpdateKayttajat = useCallback(async (hakusana: string) => {
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
  }, []);

  const debouncedSearchKayttajat = useDebounceCallback(searchAndUpdateKayttajat, 200);

  return (
    <SectionContent>
      <HassuGrid sx={{ width: "100%" }} cols={{ xs: 1, lg: 3 }}>
        <Controller
          name={`kayttoOikeudet.${index}.kayttajatunnus`}
          render={({ field: { onChange, name, onBlur, ref }, fieldState }) => (
            <Autocomplete
              options={options}
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
                />
              )}
              loading={loadingKayttajaResults}
              getOptionLabel={getKayttajaNimi}
              value={kayttaja}
              disabled={!muokattavissa}
              isOptionEqualToValue={(option, value) => option.uid === value.uid}
              onChange={(_event, newValue) => {
                setKayttaja(newValue);
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
                    {getKayttajaNimi(kayttaja)}
                  </li>
                );
              }}
            />
          )}
        />
        <TextField label="Organisaatio" value={kayttaja?.organisaatio || ""} disabled />
        {isMobile ? (
          <TextFieldWithController
            label="Puhelinnumero *"
            controllerProps={{ name: `kayttoOikeudet.${index}.puhelinnumero` }}
            inputProps={{ maxLength: maxPhoneLength }}
            disabled={disableFields}
          />
        ) : (
          <Stack direction="row" columnGap={4.5}>
            <TextFieldWithController
              label="Puhelinnumero *"
              controllerProps={{ name: `kayttoOikeudet.${index}.puhelinnumero` }}
              inputProps={{ maxLength: maxPhoneLength }}
              disabled={disableFields}
            />
            {muokattavissa && (
              <div>
                <IconButton
                  sx={{ color: "#0064AF", marginTop: 5.5 }}
                  onClick={(event) => {
                    event.preventDefault();
                    if (muokattavissa) {
                      remove(index);
                    }
                  }}
                  disabled={disableFields || !muokattavissa}
                  size="large"
                >
                  <SvgIcon>
                    <FontAwesomeIcon icon="trash" />
                  </SvgIcon>
                </IconButton>
              </div>
            )}
          </Stack>
        )}
        <TextField label="Sähköpostiosoite *" value={kayttaja?.email || ""} disabled />
        {!isProjektiPaallikko && kayttaja?.uid && isAorL(kayttaja?.uid) && (
          <Controller
            name={`kayttoOikeudet.${index}.tyyppi`}
            shouldUnregister
            render={({ field: { value, onChange, ...field } }) => (
              <div className="col-span-1 lg:col-span-2">
                <FormControlLabel
                  sx={{ marginTop: { lg: 6.5 } }}
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
                    />
                  }
                />
              </div>
            )}
          />
        )}
      </HassuGrid>
      {!muokattavissa && !isProjektiPaallikko && (
        <p>Tämän henkilön tiedot on haettu Projektivelhosta. Jos haluat poistaa tämän henkilön, muutos pitää tehdä Projektivelhoon.</p>
      )}
      <Controller<RequiredInputValues>
        name={`kayttoOikeudet.${index}.yleinenYhteystieto`}
        shouldUnregister
        render={({ field: { value, onChange, ...field } }) => (
          <FormControlLabel
            disabled={isProjektiPaallikko}
            label="Yhteystiedot näytetään julkisella puolella projektin yleisissä yhteystiedoissa."
            control={
              <Checkbox
                checked={isProjektiPaallikko ? true : !!value}
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
      {!!muokattavissa && isMobile && (
        <Button
          onClick={(event) => {
            event.preventDefault();
            if (muokattavissa) {
              remove(index);
            }
          }}
          endIcon="trash"
          disabled={disableFields || !muokattavissa}
        >
          Poista
        </Button>
      )}
    </SectionContent>
  );
};

async function loadKayttajat(kayttajat: string[]): Promise<Kayttaja[]> {
  if (kayttajat.length === 0) {
    return [];
  }
  return await api.listUsers({
    kayttajatunnus: kayttajat,
  });
}

export default KayttoOikeusHallinta;
