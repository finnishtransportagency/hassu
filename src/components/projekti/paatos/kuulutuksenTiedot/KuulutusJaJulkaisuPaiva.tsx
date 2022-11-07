import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React, { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import dayjs from "dayjs";
import log from "loglevel";
import { api, LaskuriTyyppi } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import HassuGrid from "@components/HassuGrid";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";

type Props = {};

type FormFields = {
  hyvaksymisPaatosVaihe: {
    kuulutusPaiva: string | null;
    kuulutusVaihePaattyyPaiva: string | null;
  };
};

export default function KuulutusJaJulkaisuPaiva({}: Props) {
  const { setValue } = useFormContext<FormFields>();

  const { showErrorMessage } = useSnackbars();

  const getPaattymispaiva = useCallback(
    async (value: string) => {
      try {
        const paattymispaiva = await api.laskePaattymisPaiva(value, LaskuriTyyppi.HYVAKSYMISPAATOKSEN_KUULUTUSAIKA);
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
          <HassuDatePickerWithController
            label="Kuulutuspäivä"
            minDate={dayjs().startOf("day")}
            onChange={(date) => {
              if (date?.isValid()) {
                getPaattymispaiva(date.format("YYYY-MM-DD"));
              }
            }}
            textFieldProps={{ required: true }}
            controllerProps={{
              name: "hyvaksymisPaatosVaihe.kuulutusPaiva",
            }}
          />
          <HassuDatePickerWithController
            controllerProps={{ name: "hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva" }}
            label="Kuulutusvaihe päättyy"
            disabled
          />
        </HassuGrid>
      </SectionContent>
    </Section>
  );
}
