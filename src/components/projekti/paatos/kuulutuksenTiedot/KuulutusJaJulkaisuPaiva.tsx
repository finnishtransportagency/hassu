import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React, { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import dayjs from "dayjs";
import log from "loglevel";
import { LaskuriTyyppi } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import HassuGrid from "@components/HassuGrid";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { KuulutuksenTiedotFormValues } from "@components/projekti/paatos/kuulutuksenTiedot/index";
import useApi from "src/hooks/useApi";

export default function KuulutusJaJulkaisuPaiva() {
  const { setValue, control } = useFormContext<KuulutuksenTiedotFormValues>();

  const { showErrorMessage } = useSnackbars();

  const api = useApi();

  const getPaattymispaiva = useCallback(
    async (value: string) => {
      try {
        const paattymispaiva = await api.laskePaattymisPaiva(value, LaskuriTyyppi.HYVAKSYMISPAATOKSEN_KUULUTUSAIKA);
        setValue("paatos.kuulutusVaihePaattyyPaiva", paattymispaiva);
      } catch (error) {
        showErrorMessage("Kuulutuksen päättymispäivän laskennassa tapahtui virhe");
        log.error("Kuulutusvaiheen päättymispäivän laskennassa virhe", error);
      }
    },
    [api, setValue, showErrorMessage]
  );

  return (
    <Section noDivider>
      <SectionContent>
        <h2 className="vayla-title">Kuulutus ja julkaisupäivä</h2>
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
              control,
              name: "paatos.kuulutusPaiva",
            }}
          />
          <HassuDatePickerWithController<KuulutuksenTiedotFormValues>
            controllerProps={{ control, name: "paatos.kuulutusVaihePaattyyPaiva" }}
            label="Kuulutusvaihe päättyy"
            disabled
          />
        </HassuGrid>
      </SectionContent>
    </Section>
  );
}
