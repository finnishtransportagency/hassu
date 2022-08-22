import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React from "react";
import { useFormContext } from "react-hook-form";
import { HallintoOikeus } from "@services/api";
import Select from "@components/form/Select";
import useTranslation from "next-translate/useTranslation";
import { Controller } from "react-hook-form";

type Props = {};

type FormFields = {
  hyvaksymisPaatosVaihe: {
    hallintoOikeus: HallintoOikeus;
  };
};

export default function MuutoksenHaku({}: Props) {
  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<FormFields>();

  const { t } = useTranslation("common");

  return (
    <Section noDivider>
      <SectionContent>
        <h4 className="vayla-small-title">Muutoksen haku</h4>
        <p>
          Päätökseen voi valittamalla hakea muutosta hallinto-oikeudelta 30 päivän kuluessa päätöksen tiedoksiannosta.
          Valitse pudostusvalikosta hallinto-oikeus, johon muutoksenhaku osoitetaan tehtävän.
        </p>

        <div style={{ maxWidth: "30em" }}>
          <Controller
            control={control}
            name="hyvaksymisPaatosVaihe.hallintoOikeus"
            render={({ field: { value, onChange, ...field } }) => (
              <Select
                style={{ backgroundColor: "transparent" }}
                label="Hallinto-oikeus *"
                options={Object.keys(HallintoOikeus).map((ho) => ({
                  label: ho ? t(`hallinto-oikeus.${ho}`) : "",
                  value: ho,
                }))}
                {...register(`hyvaksymisPaatosVaihe.hallintoOikeus`)}
                error={errors?.hyvaksymisPaatosVaihe?.hallintoOikeus}
                addEmptyOption
                value={value}
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
