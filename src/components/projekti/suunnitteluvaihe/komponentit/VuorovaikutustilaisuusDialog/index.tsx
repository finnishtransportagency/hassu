import Section from "@components/layout/Section";
import { Badge, Chip, chipClasses, DialogActions, DialogContent, svgIconClasses } from "@mui/material";
import React, { ReactElement, useCallback, useEffect } from "react";
import { styled } from "@mui/material/styles";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import HassuDialog from "@components/HassuDialog";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import {
  Kieli,
  Kielitiedot,
  LokalisoituTekstiInput,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusInput,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
} from "@services/api";
import { FormProvider, useFieldArray, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { vuorovaikutustilaisuudetSchema, vuorovaikutustilaisuusPaivitysSchema } from "src/schemas/vuorovaikutus";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import { poistaTypeNameJaTurhatKielet } from "src/util/removeExtraLanguagesAndTypename";
import defaultEsitettavatYhteystiedot from "src/util/defaultEsitettavatYhteystiedot";
import { getKaannettavatKielet, KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import Verkkotilaisuus from "./Verkkotilaisuus";
import YleisoTilaisuus from "./Yleisotilaisuus";
import Soittoaika from "./Soittoaika";
import SectionContent from "@components/layout/SectionContent";
import useValidationMode from "src/hooks/useValidationMode";
import { TukiEmailLink } from "../../../../EiOikeuksia";
import { focusStyle } from "@components/layout/HassuMuiThemeProvider";

export const VuorovaikutusSectionContent = styled(SectionContent)(() => ({
  ":not(:last-of-type)": {
    borderBottom: "1px solid #f0f0f0",
    paddingBottom: "3em",
  },
}));

function defaultTilaisuus(
  ensisijainenKaannettavaKieli: KaannettavaKieli,
  toissijainenKaannettavaKieli: KaannettavaKieli | undefined | null
): Omit<VuorovaikutusTilaisuusInput, "tyyppi"> {
  const nimi: LokalisoituTekstiInput = {
    [Kieli.SUOMI]: "",
    [ensisijainenKaannettavaKieli]: "",
  };
  if (toissijainenKaannettavaKieli) {
    nimi[toissijainenKaannettavaKieli] = "";
  }
  return {
    nimi,
    // paivamaara value is supposed to be entered by user
    //@ts-ignore
    paivamaara: null,
    alkamisAika: "",
    paattymisAika: "",
  };
}

function defaultOnlineTilaisuus(
  ensisijainenKaannettavaKieli: KaannettavaKieli,
  toissijainenKaannettavaKieli: KaannettavaKieli | undefined | null
): VuorovaikutusTilaisuusInput {
  return {
    ...defaultTilaisuus(ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli),
    tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
  };
}

function defaultFyysinenTilaisuus(
  ensisijainenKaannettavaKieli: KaannettavaKieli,
  toissijainenKaannettavaKieli: KaannettavaKieli | undefined | null
): VuorovaikutusTilaisuusInput {
  return {
    ...defaultTilaisuus(ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli),
    tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
  };
}

function defaultSoittoaikaTilaisuus(
  ensisijainenKaannettavaKieli: KaannettavaKieli,
  toissijainenKaannettavaKieli: KaannettavaKieli | undefined | null
): VuorovaikutusTilaisuusInput {
  return {
    ...defaultTilaisuus(ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli),
    tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
  };
}

export type VuorovaikutustilaisuusFormValues = {
  vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[];
};

function turnIntoNullIfEmpty(input: LokalisoituTekstiInput | null | undefined) {
  if (!input) return input;
  if (!Object.values(input).filter((x) => !!x).length) {
    return null;
  }
  return input;
}

function tilaisuudetInputiksi(
  tilaisuudet: VuorovaikutusTilaisuusInput[] | VuorovaikutusTilaisuus[],
  kielitiedot: Kielitiedot | undefined | null
) {
  return tilaisuudet.map((tilaisuus) => {
    const tilaisuusCopy: Partial<VuorovaikutusTilaisuusInput | VuorovaikutusTilaisuus> = { ...tilaisuus };
    delete (tilaisuusCopy as Partial<VuorovaikutusTilaisuus>).__typename;
    const palautetaan = {
      ...tilaisuusCopy,
      esitettavatYhteystiedot: defaultEsitettavatYhteystiedot(tilaisuus.esitettavatYhteystiedot),
    };
    if (palautetaan.nimi) {
      palautetaan.nimi = poistaTypeNameJaTurhatKielet(palautetaan.nimi, kielitiedot);
    }
    if (palautetaan.osoite) {
      palautetaan.osoite = poistaTypeNameJaTurhatKielet(palautetaan.osoite, kielitiedot);
    }
    if (palautetaan.paikka) {
      palautetaan.paikka = poistaTypeNameJaTurhatKielet(palautetaan.paikka, kielitiedot);
    }
    if (palautetaan.postitoimipaikka) {
      palautetaan.postitoimipaikka = poistaTypeNameJaTurhatKielet(palautetaan.postitoimipaikka, kielitiedot);
    }
    if (palautetaan.lisatiedot) {
      palautetaan.lisatiedot = poistaTypeNameJaTurhatKielet(palautetaan.lisatiedot, kielitiedot);
    }
    return palautetaan;
  });
}

interface Props {
  open: boolean;
  windowHandler: (isOpen: boolean) => void;
  tilaisuudet: VuorovaikutusTilaisuusInput[] | VuorovaikutusTilaisuus[];
  projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[];
  onSubmit: (formData: VuorovaikutustilaisuusFormValues) => void;
  mostlyDisabled?: boolean;
  projekti: ProjektiLisatiedolla;
}

export default function VuorovaikutusDialog({
  open,
  windowHandler,
  tilaisuudet,
  projektiHenkilot,
  onSubmit,
  mostlyDisabled,
  projekti,
}: Props): ReactElement {
  const validationMode = useValidationMode();

  const formOptions: UseFormProps<VuorovaikutustilaisuusFormValues, ProjektiValidationContext> = {
    resolver: yupResolver(mostlyDisabled ? vuorovaikutustilaisuusPaivitysSchema : vuorovaikutustilaisuudetSchema, {
      abortEarly: false,
      recursive: true,
    }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      vuorovaikutusTilaisuudet: tilaisuudetInputiksi(tilaisuudet, projekti?.kielitiedot),
    },
    context: { projekti, validationMode },
  };

  const useFormReturn = useForm<VuorovaikutustilaisuusFormValues, ProjektiValidationContext>(formOptions);
  const {
    control,
    reset,
    formState: { isDirty },
    handleSubmit,
    setValue,
  } = useFormReturn;

  const { fields, append, remove } = useFieldArray({
    control: control,
    name: "vuorovaikutusTilaisuudet",
  });

  useEffect(() => {
    if (tilaisuudet) {
      reset({
        vuorovaikutusTilaisuudet: tilaisuudetInputiksi(tilaisuudet, projekti?.kielitiedot),
      });
    }
  }, [tilaisuudet, reset, projekti?.kielitiedot]);

  const countTilaisuudet = useCallback(
    (tyyppi: VuorovaikutusTilaisuusTyyppi) => {
      return fields.filter((tilaisuus) => tilaisuus.tyyppi === tyyppi).length || 0;
    },
    [fields]
  );

  const saveTilaisuudet = useCallback(
    (formData: VuorovaikutustilaisuusFormValues) => {
      formData.vuorovaikutusTilaisuudet = formData.vuorovaikutusTilaisuudet.map((tilaisuus) => {
        const { nimi, osoite, paikka, postitoimipaikka, lisatiedot, ...rest } = tilaisuus;
        const nullifiedValue: VuorovaikutusTilaisuusInput = {
          postitoimipaikka: turnIntoNullIfEmpty(postitoimipaikka),
          nimi: turnIntoNullIfEmpty(nimi),
          osoite: turnIntoNullIfEmpty(osoite),
          paikka: turnIntoNullIfEmpty(paikka),
          lisatiedot: turnIntoNullIfEmpty(lisatiedot),
          ...rest,
        };
        return nullifiedValue;
      });
      onSubmit(formData);
      windowHandler(false);
    },
    [onSubmit, windowHandler]
  );

  const onClose = useCallback(() => {
    windowHandler(false);
    if (isDirty) {
      reset();
    }
  }, [isDirty, reset, windowHandler]);

  const isVerkkotilaisuuksia = !!fields.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA);
  const isYleisotilaisuuksia = !!fields.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA);
  const isSoittoaikoja = !!fields.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA);

  const kielitiedot = projekti?.kielitiedot;
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);
  if (!kielitiedot) return <></>;

  return (
    <HassuDialog scroll="body" open={open} title="Vuorovaikutustilaisuuden lisääminen" onClose={onClose} maxWidth={"lg"}>
      <DialogContent>
        <FormProvider {...useFormReturn}>
          <form>
            <HassuStack>
              {mostlyDisabled ? (
                <p>
                  Kutsun julkaisun jälkeen vuorovaikutustilaisuuksien tietojen muokkausta on rajoitettu. Tieto tilaisuuden peruutuksesta
                  tulee näkyviin palvelun julkiselle puolelle tilaisuuden tietojen yhteyteen. Jos sinun tulee järjestää uudet
                  vuorovaikutustilaisuudet peruuntuneiden tilalle, olethan yhteydessä <TukiEmailLink />.
                </p>
              ) : (
                <p>Voit valita saman vuorovaikutustavan useammin kuin yhden kerran.</p>
              )}
              {ensisijainenKaannettavaKieli && (
                <HassuStack direction={["column", "column", "row"]}>
                  <VerkkoTilaisuusNappi
                    id="add_live_tilaisuus"
                    label="Verkkotilaisuus"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      append(defaultOnlineTilaisuus(ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli));
                    }}
                    icon={<HeadphonesIcon />}
                    mostlyDisabled={!!mostlyDisabled}
                    countTilaisuudet={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.VERKOSSA)}
                  />
                  <VerkkoTilaisuusNappi
                    id="add_fyysinen_tilaisuus"
                    label="Yleisötilaisuus"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      append(defaultFyysinenTilaisuus(ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli));
                    }}
                    icon={<LocationCityIcon />}
                    mostlyDisabled={!!mostlyDisabled}
                    countTilaisuudet={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.PAIKALLA)}
                  />
                  <VerkkoTilaisuusNappi
                    id="add_soittoaika"
                    label="Soittoaika"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      append(defaultSoittoaikaTilaisuus(ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli));
                    }}
                    icon={<LocalPhoneIcon />}
                    mostlyDisabled={!!mostlyDisabled}
                    countTilaisuudet={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.SOITTOAIKA)}
                  />
                </HassuStack>
              )}
              {isVerkkotilaisuuksia && (
                <Section>
                  <h4 className="vayla-small-title">Verkkotilaisuudet</h4>
                  {fields.map((tilaisuus, index) => {
                    if (tilaisuus.tyyppi !== VuorovaikutusTilaisuusTyyppi.VERKOSSA) {
                      return;
                    }
                    return (
                      <Verkkotilaisuus
                        key={index}
                        index={index}
                        kielitiedot={kielitiedot}
                        setValue={setValue}
                        remove={remove}
                        mostlyDisabled={mostlyDisabled}
                      />
                    );
                  })}
                </Section>
              )}
              {isYleisotilaisuuksia && (
                <Section>
                  <h4 className="vayla-small-title">Yleisötilaisuudet</h4>
                  {fields.map((tilaisuus, index) => {
                    if (tilaisuus.tyyppi !== VuorovaikutusTilaisuusTyyppi.PAIKALLA) {
                      return;
                    }
                    return (
                      <YleisoTilaisuus
                        key={index}
                        index={index}
                        kielitiedot={kielitiedot}
                        setValue={setValue}
                        remove={remove}
                        mostlyDisabled={mostlyDisabled}
                      />
                    );
                  })}
                </Section>
              )}
              {isSoittoaikoja && (
                <Section>
                  <h4 className="vayla-small-title">Soittoajat</h4>
                  {fields.map((tilaisuus, index) => {
                    if (tilaisuus.tyyppi !== VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) {
                      return;
                    }
                    return (
                      <Soittoaika
                        key={index}
                        index={index}
                        kielitiedot={kielitiedot}
                        setValue={setValue}
                        remove={remove}
                        mostlyDisabled={mostlyDisabled}
                        projektiHenkilot={projektiHenkilot}
                      />
                    );
                  })}
                </Section>
              )}
            </HassuStack>
          </form>
        </FormProvider>
      </DialogContent>

      <DialogActions>
        <Button primary onClick={handleSubmit(saveTilaisuudet)} id="save_vuorovaikutus_tilaisuudet">
          {mostlyDisabled ? "Päivitä" : "OK"}
        </Button>
        <Button
          onClick={(e) => {
            reset();
            onClose();
            e.preventDefault();
          }}
        >
          Peruuta
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}

const HassuBadge = styled(Badge)(() => ({
  [`&.${chipClasses.deleteIcon}`]: {
    marginLeft: "0.5rem !important",
    marginRight: "1rem !important",
  },
  [`&.${chipClasses.label}`]: {
    paddingRight: "0px",
  },
  [`&.clicked`]: {
    "> *": {
      background: "#bbdbf0",
      color: "rgb(0, 100, 175)",
    },
  },
}));

const HassuChip = styled(Chip)(({ theme }) => ({
  paddingRight: 4,
  paddingLeft: 4,
  [`&.${chipClasses.root}`]: {
    height: "40px",
    borderRadius: "20px",
  },
  [`&.${chipClasses.clickable}`]: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: theme.palette.primary.dark,
    background: theme.palette.common.white,
    margin: 4,
    [`> .${svgIconClasses.root}`]: {
      color: theme.palette.primary.dark,
    },
    "&:hover": {
      background: "#e2eff8",
      boxShadow: "rgba(0, 0, 0, 0.16) 0px 1px 4px",
    },
  },
  [`&.clicked`]: {
    background: theme.palette.primary.dark,
    color: "#e2eff8",
    [`> .${svgIconClasses.root}`]: {
      color: "#e2eff8",
    },
    "&:hover": {
      background: "rgb(0, 70, 145)",
      boxShadow: "rgba(0, 0, 0, 0.16) 0px 1px 4px",
    },
  },
  ["&.Mui-focusVisible"]: focusStyle,
  [`&.Mui-disabled`]: {
    opacity: 100,
    background: "#999999",
    color: "#f8f8f8",
    [`> .${svgIconClasses.root}`]: {
      color: "#f8f8f8",
    },
    [`* > .MuiBadge-badge`]: {
      background: "#f8f8f8",
      color: "#999999",
    },
  },
}));

function VerkkoTilaisuusNappi({
  id,
  label,
  mostlyDisabled,
  onClick,
  countTilaisuudet,
  icon,
}: {
  id: string;
  icon: React.ReactElement;
  label: string;
  mostlyDisabled: boolean;
  countTilaisuudet: number;
  onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}) {
  return (
    <HassuChip
      className={countTilaisuudet ? "clicked" : undefined}
      disabled={mostlyDisabled}
      icon={icon}
      clickable={!mostlyDisabled}
      onClick={onClick}
      id={id}
      label={label}
      onDelete={countTilaisuudet ? onClick : undefined}
      deleteIcon={countTilaisuudet ? <HassuBadge className="clicked" badgeContent={countTilaisuudet} color="primary" /> : undefined}
    />
  );
}
