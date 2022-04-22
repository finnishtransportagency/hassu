import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { ReactElement } from "react";
import { Badge, Chip, chipClasses } from "@mui/material";
import { styled } from "@mui/material/styles";
import Button from "@components/button/Button";
import DatePicker from "@components/form/DatePicker";
import HassuStack from "@components/layout/HassuStack";
import HassuDialog from "@components/HassuDialog";
import WindowCloseButton from "@components/button/WindowCloseButton";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import TextInput from "@components/form/TextInput";
import Select from "@components/form/Select";
import HassuGrid from "@components/HassuGrid";
import TimePicker from "@components/form/TimePicker";
import { KaytettavaPalvelu, VuorovaikutusTilaisuusInput, VuorovaikutusTilaisuusTyyppi } from "@services/api";
import capitalize from "lodash/capitalize";
import { useFieldArray, useFormContext } from "react-hook-form";
import { VuorovaikutusFormValues } from "@components/projekti/suunnitteluvaihe/SuunniteluvaiheenVuorovaikuttaminen";

const defaultOnlineTilaisuus: VuorovaikutusTilaisuusInput = {
  nimi: "",
  paivamaara: "",
  alkamisAika: "",
  paattymisAika: "",
  tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
};

const defaultFyysinenTilaisuus: VuorovaikutusTilaisuusInput = {
  nimi: "",
  paivamaara: "",
  alkamisAika: "",
  paattymisAika: "",
  tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
};

const defaultSoittoaikaTilaisuus: VuorovaikutusTilaisuusInput = {
  nimi: "",
  paivamaara: "",
  alkamisAika: "",
  paattymisAika: "",
  tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
};

interface Props {
  open: boolean;
  windowHandler: (isOpen: boolean) => void;
}
export default function VuorovaikutusDialog({ open, windowHandler }: Props): ReactElement {
  const {
    register,
    // formState: { errors },
    control,
  } = useFormContext<VuorovaikutusFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet",
  });

  const HassuBadge = styled(Badge)(() => ({
    [`&.${chipClasses.deleteIcon}`]: {
      marginLeft: "0.5rem",
      marginRight: "1rem",
    },
    [`&.${chipClasses.label}`]: {
      paddingRight: "0px",
    },
  }));

  const countTilaisuudet = (tyyppi: VuorovaikutusTilaisuusTyyppi) => {
    return fields.filter((tilaisuus) => tilaisuus.tyyppi === tyyppi).length || "0";
  };

  return (
    <HassuDialog open={open} onClose={() => windowHandler(false)} maxWidth={"lg"}>
      <Section noDivider smallGaps>
        <SectionContent>
          <div className="vayla-dialog-title flex">
            <div className="flex-grow">Vuorovaikutustilaisuuden lisääminen</div>
            <div className="justify-end">
              <WindowCloseButton onClick={() => windowHandler(false)}></WindowCloseButton>
            </div>
          </div>
        </SectionContent>
        <SectionContent>
          <div className="vayla-dialog-content">
            <HassuStack>
              <p>Voit valita saman vuorovaikutustavan useammin kuin yhden kerran.</p>
              <HassuStack direction={["column", "column", "row"]}>
                <Chip
                  icon={<HeadphonesIcon />}
                  clickable
                  onClick={(event) => {
                    event.preventDefault();
                    append(defaultOnlineTilaisuus);
                  }}
                  label="Live-tilaisuus verkossa"
                  variant="outlined"
                  onDelete={() => {
                    append(defaultOnlineTilaisuus);
                  }}
                  deleteIcon={
                    <HassuBadge
                      badgeContent={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.VERKOSSA)}
                      color={"primary"}
                    />
                  }
                />
                <Chip
                  icon={<LocationCityIcon />}
                  clickable
                  onClick={(event) => {
                    event.preventDefault();
                    append(defaultFyysinenTilaisuus);
                  }}
                  label="Fyysinen tilaisuus"
                  variant="outlined"
                  onDelete={() => {
                    append(defaultFyysinenTilaisuus);
                  }}
                  deleteIcon={
                    <HassuBadge
                      badgeContent={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.PAIKALLA)}
                      color={"primary"}
                    />
                  }
                />
                <Chip
                  icon={<LocalPhoneIcon />}
                  clickable
                  onClick={(event) => {
                    event.preventDefault();
                    append(defaultSoittoaikaTilaisuus);
                  }}
                  label="Soittoaika"
                  variant="outlined"
                  onDelete={() => {
                    append(defaultSoittoaikaTilaisuus);
                  }}
                  deleteIcon={
                    <HassuBadge
                      badgeContent={countTilaisuudet(VuorovaikutusTilaisuusTyyppi.SOITTOAIKA)}
                      color={"primary"}
                    />
                  }
                />
              </HassuStack>

              {fields.map((tilaisuus, index) => {
                return (
                  <Section key={tilaisuus.id}>
                    <SectionContent>
                      {tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA && <h4 className="vayla-small-title">Live-tilaisuudet verkossa</h4>}
                      {tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA && <h4 className="vayla-small-title">Fyysiset tilaisuudet</h4>}
                      {tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA && <h4 className="vayla-small-title">Soittoaika</h4>}
                      <TextInput
                        label="Tilaisuuden nimi *"
                        {...register(`suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet.${index}.nimi`)}
                        // error={errors?.suunnitteluVaihe?.vuorovaikutus?...}
                        maxLength={200}
                      ></TextInput>
                      <HassuStack direction={["column", "column", "row"]}>
                        <DatePicker
                          label="Päivämäärä *"
                          {...register(`suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet.${index}.paivamaara`)}
                          // error={errors?.suunnitteluVaihe?.vuorovaikutus?...}
                        ></DatePicker>
                        <TimePicker
                          label="Alkaa *"
                          {...register(`suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet.${index}.alkamisAika`)}
                          // error={errors?.suunnitteluVaihe?.vuorovaikutus?...}
                        ></TimePicker>
                        <TimePicker
                          label="Päättyy *"
                          {...register(
                            `suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet.${index}.paattymisAika`
                          )}
                          // error={errors?.suunnitteluVaihe?.vuorovaikutus?...}
                        ></TimePicker>
                      </HassuStack>
                      <HassuGrid cols={{ lg: 3 }}>
                        <Select
                          addEmptyOption
                          options={Object.keys(KaytettavaPalvelu).map((palvelu) => {
                            return { label: capitalize(palvelu), value: palvelu };
                          })}
                          label="Käytettävä palvelu *"
                          {...register(
                            `suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet.${index}.kaytettavaPalvelu`
                          )}
                          // error={errors?.suunnitteluVaihe?.vuorovaikutus?...}
                        />
                      </HassuGrid>
                      <TextInput
                        label="Linkki tilaisuuteen *"
                        maxLength={200}
                        {...register(`suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet.${index}.linkki`)}
                        // error={errors?.suunnitteluVaihe?.vuorovaikutus?...}
                      ></TextInput>
                      <p>
                        Linkki tilaisuuteen julkaistaan palvelun julkisella puolella kaksi (2) tuntia ennen tilaisuuden
                        alkamista.
                      </p>
                      <Button
                        onClick={(event) => {
                          event.preventDefault();
                          remove(index);
                        }}
                      >
                        Poista
                      </Button>
                    </SectionContent>
                  </Section>
                );
              })}
            </HassuStack>
            <HassuStack
              direction={["column", "column", "row"]}
              justifyContent={[undefined, undefined, "flex-end"]}
              paddingTop={"1rem"}
            >
              <Button
                primary
                onClick={(e) => {
                  windowHandler(false);
                  e.preventDefault();
                }}
              >
                Tallenna
              </Button>
              <Button
                onClick={(e) => {
                  //TODO isDirty -> poista muutokset
                  windowHandler(false);
                  e.preventDefault();
                }}
              >
                Peruuta
              </Button>
            </HassuStack>
          </div>
        </SectionContent>
      </Section>
    </HassuDialog>
  );
}
