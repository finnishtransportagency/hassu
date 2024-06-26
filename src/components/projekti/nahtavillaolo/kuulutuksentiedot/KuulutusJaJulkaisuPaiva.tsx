import Section from "@components/layout/Section2";
import ContentSpacer from "@components/layout/ContentSpacer";
import React, { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import log from "loglevel";
import { LaskuriTyyppi } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import HassuGrid from "@components/HassuGrid";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { today } from "hassu-common/util/dateUtils";
import useApi from "src/hooks/useApi";
import { H2, H3 } from "../../../Headings";

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
      <ContentSpacer>
        <H2>Kuulutus ja julkaisupäivä</H2>
        <p>Anna päivämäärä, jolle kuulutus päivätään ja julkaistaan palvelun julkisella puolella.</p>
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
      </ContentSpacer>
      <ContentSpacer>
        <H3>Muistutusten antaminen</H3>
        <p>
          Kansalaisten tulee muistuttaa suunnitelmista järjestelmän kautta viimeistään alla olevana päivämääränä. Muistutusten päivämäärä
          määräytyy kuulutuksen nähtävilläoloajan mukaan ja sitä ei voi muokata.
        </p>
        <div>
          <HassuDatePickerWithController
            label="Muistutusoikeus päättyy"
            controllerProps={{
              name: "nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva",
            }}
            minDate={today()}
            disabled
          />
        </div>
      </ContentSpacer>
    </Section>
  );
}
