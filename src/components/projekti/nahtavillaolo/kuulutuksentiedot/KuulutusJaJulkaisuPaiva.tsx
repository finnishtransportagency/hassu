import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React, { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import log from "loglevel";
import { LaskuriTyyppi } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import HassuGrid from "@components/HassuGrid";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { today } from "src/util/dateUtils";
import useApi from "src/hooks/useApi";

type FormFields = {
  nahtavillaoloVaihe: {
    kuulutusPaiva: string | null;
    kuulutusVaihePaattyyPaiva: string | null;
    muistutusoikeusPaattyyPaiva: string | null;
  };
};

export default function KuulutusJaJulkaisuPaiva() {
  const { setValue } = useFormContext<FormFields>();

  const { showErrorMessage } = useSnackbars();
  const api = useApi();

  const getPaattymispaiva = useCallback(
    async (value: string) => {
      try {
        const paattymispaiva = await api.laskePaattymisPaiva(
          value,
          LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA // LaskuriTyyppi.NAHTAVILLAOLOKUULUTUKSEN_PAATTYMISPAIVA
        );
        setValue("nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva", paattymispaiva);
      } catch (error) {
        showErrorMessage("Kuulutuksen päättymispäivän laskennassa tapahtui virhe");
        log.error("Nähtävilläolon päättymispäivän laskennassa virhe", error);
      }
      try {
        const muistutuspaiva = await api.laskePaattymisPaiva(
          value,
          LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA //LaskuriTyyppi.MUISTUTUSTEN_PAATTYMISPAIVA
        );
        setValue("nahtavillaoloVaihe.muistutusoikeusPaattyyPaiva", muistutuspaiva);
      } catch (error) {
        showErrorMessage("Muistutuspäivän laskennassa tapahtui virhe");
        log.error("Muistutuspäivän laskennassa virhe", error);
      }
    },
    [api, setValue, showErrorMessage]
  );

  return (
    <Section noDivider>
      <SectionContent>
        <h4 className="vayla-small-title">Kuulutus ja julkaisupäivä</h4>
        <p>
          Anna päivämäärä, jolle kuulutus päivätään ja nähtävilläolevan suunnitelman materiaalit julkaistaan palvelun julkisella puolella.
        </p>
        <HassuGrid cols={{ lg: 3 }}>
          <HassuDatePickerWithController
            label="Kuulutuspäivä *"
            controllerProps={{
              name: "nahtavillaoloVaihe.kuulutusPaiva",
            }}
            minDate={today()}
            onChange={(date) => {
              if (date?.isValid()) {
                getPaattymispaiva(date.format("YYYY-MM-DD"));
              }
            }}
          />
          <HassuDatePickerWithController
            label="Kuulutusvaihe päättyy"
            controllerProps={{
              name: "nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva",
            }}
            disabled
          />
        </HassuGrid>
      </SectionContent>
      <SectionContent>
        <h4 className="vayla-small-title">Muistutusten antaminen</h4>
        <p>
          Kansalaisten tulee muistuttaa suunnitelmasta järjestelmän kautta viimeistään alla olevana päivämääränä. Muistutusten päivämäärä
          määräytyy kuulutuksen nähtävilläoloajan mukaan, ja sitä ei voi muokata.
        </p>
        <HassuDatePickerWithController
          label="Muistutusoikeus päättyy"
          controllerProps={{
            name: "nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva",
          }}
          minDate={today()}
          disabled
        />
      </SectionContent>
    </Section>
  );
}
