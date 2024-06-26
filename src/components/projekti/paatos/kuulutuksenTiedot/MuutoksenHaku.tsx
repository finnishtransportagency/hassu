import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React from "react";
import { useFormContext } from "react-hook-form";
import { HallintoOikeus } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import { KuulutuksenTiedotFormValues } from "@components/projekti/paatos/kuulutuksenTiedot/index";
import HassuMuiSelect from "@components/form/HassuMuiSelect";
import { MenuItem } from "@mui/material";
import { H3 } from "../../../Headings";

export default function MuutoksenHaku() {
  const {
    formState: { errors },
    control,
  } = useFormContext<KuulutuksenTiedotFormValues>();

  const { t } = useTranslation("common");

  return (
    <Section noDivider>
      <SectionContent>
        <H3>Muutoksen haku</H3>
        <p>
          Päätökseen voi valittamalla hakea muutosta hallinto-oikeudelta 30 päivän kuluessa päätöksen tiedoksisaannista. Valitse
          pudotusvalikosta hallinto-oikeus, johon muutoksenhaku osoitetaan tehtävän.
        </p>

        <div style={{ maxWidth: "30em" }}>
          <HassuMuiSelect
            label="Hallinto-oikeus *"
            control={control}
            defaultValue=""
            name="paatos.hallintoOikeus"
            error={errors?.paatos?.hallintoOikeus}
          >
            {Object.keys(HallintoOikeus).map((ho) => {
              return (
                <MenuItem key={ho} value={ho}>
                  {t(`hallinto-oikeus.${ho}`)}
                </MenuItem>
              );
            })}
          </HassuMuiSelect>
        </div>
      </SectionContent>
    </Section>
  );
}
