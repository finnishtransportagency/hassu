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
import { KaytettavaPalvelu, VuorovaikutusInput, VuorovaikutusTilaisuusInput, VuorovaikutusTilaisuusTyyppi } from "@services/api";
import capitalize from "lodash/capitalize";
import { useFieldArray, useFormContext } from "react-hook-form";

type FormFields = {
  suunnitteluVaihe: {
    vuorovaikutus: Pick<
      VuorovaikutusInput,
      | "vuorovaikutusTilaisuudet"
    >;
  };
}

const defaultTilaisuus: VuorovaikutusTilaisuusInput = {
  nimi: "",
  alkamisAika: "",
  paattymisAika: "",
  paivamaara: "",
  tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA
}

interface Props {
  open: boolean;
  windowHandler: (isOpen: boolean) => void;
}
export default function VuorovaikutusDialog({ open, windowHandler }: Props): ReactElement {
  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<FormFields>(); // retrieve all hook methods

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
            <form>
              <HassuStack>
                <p>Voit valita saman vuorovaikutustavan useammin kuin yhden kerran.</p>
                <HassuStack direction={["column", "column", "row"]}>
                  <Chip
                    icon={<HeadphonesIcon />}
                    clickable
                    onClick={(event) => {
                      event.preventDefault();
                      append(defaultTilaisuus);
                    }}
                    label="Live-tilaisuus verkossa"
                    variant="outlined"
                    onDelete={() => console.log("lul delete")}
                    deleteIcon={<HassuBadge badgeContent={2} color={"primary"} />}
                  />
                  <Chip
                    icon={<LocationCityIcon />}
                    clickable
                    label="Fyysinen tilaisuus"
                    variant="outlined"
                    onDelete={() => console.log("delete lul")}
                    deleteIcon={<HassuBadge badgeContent={1} color={"primary"} />}
                  />
                  <Chip
                    icon={<LocalPhoneIcon />}
                    clickable
                    label="Soittoaika"
                    variant="outlined"
                    onDelete={() => console.log("d lul")}
                    deleteIcon={<HassuBadge badgeContent={"0"} color={"primary"} />}
                  />
                </HassuStack>
                <Section>
                  {fields.map((tilaisuus, index) => {
                    <>
                      <TextInput
                        label="Tilaisuuden nimi *"
                        {...register(`suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet.${index}.nimi`)}
                        // error={errors2.syy}
                        maxLength={200}
                      ></TextInput>
                      <HassuStack direction={["column", "column", "row"]}>
                        <DatePicker label="Päivämäärä *"></DatePicker>
                        <TimePicker label="Alkaa *"></TimePicker>
                        <TimePicker label="Päättyy *"></TimePicker>
                      </HassuStack>
                      <HassuGrid cols={{ lg: 3 }}>
                        <Select
                          addEmptyOption
                          options={Object.keys(KaytettavaPalvelu).map((palvelu) => {
                            return { label: capitalize(palvelu), value: palvelu };
                          })}
                          label="Käytettävä palvelu *"
                        />
                      </HassuGrid>
                      <TextInput label="Linkki tilaisuuteen *" maxLength={200}></TextInput>
                      <p>
                        Linkki tilaisuuteen julkaistaan palvelun julkisella puolella kaksi (2) tuntia ennen tilaisuuden
                        alkamista.
                      </p>
                      <Button>Poista</Button>
                    </>;
                  })}
                </Section>
              </HassuStack>
              <HassuStack
                direction={["column", "column", "row"]}
                justifyContent={[undefined, undefined, "flex-end"]}
                paddingTop={"1rem"}
              >
                <Button primary onClick={() => console.log("tallenna")}>
                  Tallenna
                </Button>
                <Button
                  onClick={(e) => {
                    windowHandler(false);
                    e.preventDefault();
                  }}
                >
                  Peruuta
                </Button>
              </HassuStack>
            </form>
          </div>
        </SectionContent>
      </Section>
    </HassuDialog>
  );
}
