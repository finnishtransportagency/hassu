import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { ReactElement, useState } from "react";
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

interface Props {
  open: boolean;
  windowHandler: (isDirty: boolean) => void;
}
export default function VuorovaikutusDialog({ open, windowHandler }: Props): ReactElement {

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
                    label="Live-tilaisuus verkossa"
                    variant="outlined"
                    onDelete={() => console.log("lul")}
                    deleteIcon={<HassuBadge badgeContent={7} color={"primary"} />}
                  />
                  <Chip
                    icon={<LocationCityIcon />}
                    clickable
                    label="Fyysinen tilaisuus"
                    variant="outlined"
                    onDelete={() => console.log("lul")}
                    deleteIcon={<HassuBadge badgeContent={2} color={"primary"} />}
                  />
                  <Chip
                    icon={<LocalPhoneIcon />}
                    clickable
                    label="Soittoaika"
                    variant="outlined"
                    onDelete={() => console.log("lul")}
                    deleteIcon={<HassuBadge badgeContent={"0"} color={"primary"} />}
                  />
                </HassuStack>
                <Section>
                  <TextInput
                    label="Tilaisuuden nimi *"
                    // {...register2("syy", { required: "Palautuksen syy täytyy antaa" })}
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
                      options={[
                        { label: "Teams", value: "TEAMS" },
                        { label: "Zoom", value: "ZOOM" },
                      ]}
                      label="Käytettävä palvelu *"
                    />
                  </HassuGrid>
                  <TextInput label="Linkki tilaisuuteen *" maxLength={200}></TextInput>
                  <p>
                    Linkki tilaisuuteen julkaistaan palvelun julkisella puolella kaksi (2) tuntia ennen tilaisuuden
                    alkamista.
                  </p>
                  <Button>Poista</Button>
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
