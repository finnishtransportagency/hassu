import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React, { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import DatePicker from "@components/form/DatePicker";
import dayjs from "dayjs";
import log from "loglevel";
import { api, LaskuriTyyppi } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import HassuGrid from "@components/HassuGrid";

type Props = {};

type FormFields = {
  hyvaksymisPaatosVaihe: {
    kuulutusPaiva: string | null;
    kuulutusVaihePaattyyPaiva: string | null;
  };
};

export default function KuulutusJaJulkaisuPaiva({}: Props) {
  const {
    register,
    formState: { errors },
    setValue,
  } = useFormContext<FormFields>();

  const { showErrorMessage } = useSnackbars();

  const today = dayjs().format();

  const getPaattymispaiva = useCallback(
    async (value: string) => {
      try {
        const paattymispaiva = await api.laskePaattymisPaiva(
          value,
          LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA // TODO: Tähän jotain muuta??
        );
        setValue("hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva", paattymispaiva);
      } catch (error) {
        showErrorMessage("Kuulutuksen päättymispäivän laskennassa tapahtui virhe");
        log.error("Kuulutusvaiheen päättymispäivän laskennassa virhe", error);
      }
    },
    [setValue, showErrorMessage]
  );

  return (
    <Section noDivider>
      <SectionContent>
        <h4 className="vayla-small-title">Kuulutus ja julkaisupäivä</h4>
        <p>Anna päivämäärä, jolle kuulutus päivätään ja julkaistaan palvelun julkisella puolella.</p>
        <HassuGrid cols={{ lg: 3 }}>
          <DatePicker
            label="Kuulutuspäivä *"
            className="md:max-w-min"
            {...register("hyvaksymisPaatosVaihe.kuulutusPaiva")}
            min={today}
            error={errors.hyvaksymisPaatosVaihe?.kuulutusPaiva}
            onChange={(event) => {
              getPaattymispaiva(event.target.value);
            }}
          />
          <DatePicker
            className="md:max-w-min"
            label="Kuulutusvaihe päättyy"
            readOnly
            {...register("hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva")}
          />
        </HassuGrid>
      </SectionContent>
    </Section>
  );
}
