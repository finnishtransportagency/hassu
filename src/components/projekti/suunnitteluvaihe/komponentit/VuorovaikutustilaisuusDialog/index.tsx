import Section from "@components/layout/Section";
import { Badge, Chip, chipClasses, DialogActions, DialogContent } from "@mui/material";
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
import { useProjekti } from "src/hooks/useProjekti";
import { poistaTypeNameJaTurhatKielet } from "src/util/removeExtraLanguagesAndTypename";
import defaultEsitettavatYhteystiedot from "src/util/defaultEsitettavatYhteystiedot";
import { getKaannettavatKielet, KaannettavaKieli } from "common/kaannettavatKielet";
import Livetilaisuus from "./Livetilaisuus";
import FyysinenTilaisuus from "./FyysinenTilaisuus";
import Soittoaika from "./Soittoaika";
import SectionContent from "@components/layout/SectionContent";

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
}

export default function VuorovaikutusDialog({
  open,
  windowHandler,
  tilaisuudet,
  projektiHenkilot,
  onSubmit,
  mostlyDisabled,
}: Props): ReactElement {
  const { data: projekti } = useProjekti();

  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(projekti?.kielitiedot);

  const formOptions: UseFormProps<VuorovaikutustilaisuusFormValues> = {
    resolver: yupResolver(mostlyDisabled ? vuorovaikutustilaisuusPaivitysSchema : vuorovaikutustilaisuudetSchema, {
      abortEarly: false,
      recursive: true,
    }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      vuorovaikutusTilaisuudet: tilaisuudetInputiksi(tilaisuudet, projekti?.kielitiedot),
    },
    context: { projekti },
  };

  const useFormReturn = useForm<VuorovaikutustilaisuusFormValues>(formOptions);
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

  const HassuBadge = styled(Badge)(() => ({
    [`&.${chipClasses.deleteIcon}`]: {
      marginLeft: "0.5rem",
      marginRight: "1rem",
    },
    [`&.${chipClasses.label}`]: {
      paddingRight: "0px",
    },
  }));

  const HassuChip = styled(Chip)(() => ({
    [`&.${chipClasses.root}`]: {
      height: "40px",
      borderRadius: "20px",
    },
  }));

  const countTilaisuudet = useCallback(
    (tyyppi: VuorovaikutusTilaisuusTyyppi) => {
      return fields.filter((tilaisuus) => tilaisuus.tyyppi === tyyppi).length || "0";
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
  const isFyysisiatilaisuuksia = !!fields.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA);
  const isSoittoaikoja = !!fields.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA);

  return (
    <HassuDialog scroll="body" open={open} title="Vuorovaikutustilaisuuden lisääminen" onClose={onClose} maxWidth={"lg"}>
      <DialogContent>
        <FormProvider {...useFormReturn}>
          <form>
            <HassuStack>
              {mostlyDisabled ? (
                <p>Voit valita saman vuorovaikutustavan useammin kuin yhden kerran.</p>
              ) : (
                <p>
                  Kutsun jälkeen vuorovaikutustilaisuuksien muokkausta on rajoitettu. Tilaisuuden peruminen lähettää <b>minne ja mitä</b>.
                  Jos sinun tulee järjestää uudet vuorovaikutustilaisuudet peruuntuneiden tilalle, olethan yhteydessä suunnitteluohjeukseen.
                </p>
              )}
              {ensisijainenKaannettavaKieli && (
                <HassuStack direction={["column", "column", "row"]}>
                  <HassuChip
                    disabled={mostlyDisabled}
                    icon={<HeadphonesIcon />}
                    clickable={!mostlyDisabled}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      append(defaultOnlineTilaisuus(ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli));
                    }}
                    id="add_live_tilaisuus"
                    label="Live-tilaisuus verkossa"
                    variant="outlined"
                    onDelete={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      append(defaultOnlineTilaisuus(ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli));
                    }}
                    deleteIcon={<HassuBadge badgeContent={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.VERKOSSA)} color={"primary"} />}
                  />
                  <HassuChip
                    disabled={mostlyDisabled}
                    icon={<LocationCityIcon />}
                    clickable={!mostlyDisabled}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      append(defaultFyysinenTilaisuus(ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli));
                    }}
                    id="add_fyysinen_tilaisuus"
                    label="Fyysinen tilaisuus"
                    variant="outlined"
                    onDelete={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      append(defaultFyysinenTilaisuus(ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli));
                    }}
                    deleteIcon={<HassuBadge badgeContent={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.PAIKALLA)} color={"primary"} />}
                  />
                  <HassuChip
                    disabled={mostlyDisabled}
                    icon={<LocalPhoneIcon />}
                    clickable={!mostlyDisabled}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      append(defaultSoittoaikaTilaisuus(ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli));
                    }}
                    id="add_soittoaika"
                    label="Soittoaika"
                    variant="outlined"
                    onDelete={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      append(defaultSoittoaikaTilaisuus(ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli));
                    }}
                    deleteIcon={<HassuBadge badgeContent={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.SOITTOAIKA)} color={"primary"} />}
                  />
                </HassuStack>
              )}
              {isVerkkotilaisuuksia && (
                <Section>
                  <h4 className="vayla-small-title">Live-tilaisuudet verkossa</h4>
                  {fields.map((tilaisuus, index) => {
                    if (tilaisuus.tyyppi !== VuorovaikutusTilaisuusTyyppi.VERKOSSA) {
                      return;
                    }
                    return (
                      <Livetilaisuus
                        key={index}
                        index={index}
                        ensisijainenKaannettavaKieli={ensisijainenKaannettavaKieli}
                        toissijainenKaannettavaKieli={toissijainenKaannettavaKieli}
                        setValue={setValue}
                        remove={remove}
                        mostlyDisabled={mostlyDisabled}
                      />
                    );
                  })}
                </Section>
              )}
              {isFyysisiatilaisuuksia && (
                <Section>
                  <h4 className="vayla-small-title">Fyysiset tilaisuudet</h4>
                  {fields.map((tilaisuus, index) => {
                    if (tilaisuus.tyyppi !== VuorovaikutusTilaisuusTyyppi.PAIKALLA) {
                      return;
                    }
                    return (
                      <FyysinenTilaisuus
                        key={index}
                        index={index}
                        ensisijainenKaannettavaKieli={ensisijainenKaannettavaKieli}
                        toissijainenKaannettavaKieli={toissijainenKaannettavaKieli}
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
                        ensisijainenKaannettavaKieli={ensisijainenKaannettavaKieli}
                        toissijainenKaannettavaKieli={toissijainenKaannettavaKieli}
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
          {mostlyDisabled ? "Päivitä" : "Tallenna"}
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
