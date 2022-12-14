import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React from "react";
import { useFormContext } from "react-hook-form";
import { HallintoOikeus } from "@services/api";
import Select from "@components/form/Select";
import useTranslation from "next-translate/useTranslation";
import { Controller } from "react-hook-form";
import { KuulutuksenTiedotFormValues } from "@components/projekti/paatos/kuulutuksenTiedot/index";

export default function MuutoksenHaku() {
  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<KuulutuksenTiedotFormValues>();

  const { t } = useTranslation("common");

  return (
    <Section noDivider>
      <SectionContent>
        <h4 className="vayla-small-title">Muutoksen haku</h4>
        <p>
          Päätökseen voi valittamalla hakea muutosta hallinto-oikeudelta 30 päivän kuluessa päätöksen tiedoksiannosta. Valitse
          pudostusvalikosta hallinto-oikeus, johon muutoksenhaku osoitetaan tehtävän.
        </p>

        <div style={{ maxWidth: "30em" }}>
          <Controller
            control={control}
            name="paatos.hallintoOikeus"
            render={({ field: { value, onChange, ...field } }) => (
              <Select
                style={{ backgroundColor: "transparent" }}
                label="Hallinto-oikeus *"
                options={Object.keys(HallintoOikeus).map((ho) => ({
                  label: ho ? t(`hallinto-oikeus.${ho}`) : "",
                  value: ho || "",
                }))}
                {...register(`paatos.hallintoOikeus`)}
                error={errors?.paatos?.hallintoOikeus}
                addEmptyOption
                value={value || ""}
                onChange={(event) => onChange(event.target.value)}
                {...field}
              />
            )}
          />
        </div>
      </SectionContent>
    </Section>
  );
}
