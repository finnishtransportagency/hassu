import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import React, { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { KuulutuksenTiedotFormValues } from "./KuulutuksenTiedot";
import DatePicker from "@components/form/DatePicker";
import dayjs from "dayjs";
import log from "loglevel";
// import { api, LaskuriTyyppi } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import HassuGrid from "@components/HassuGrid";

type Props = {};

export default function KuulutusJaJulkaisuPaiva({}: Props) {
  const {
    register,
    formState: { errors },
    control,
    setValue,
  } = useFormContext<KuulutuksenTiedotFormValues>();

  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const today = dayjs().format();

  const getPaattymispaiva = useCallback(
    async (value: string) => {
      try {
        //const paattymispaiva = await api.laskePaattymisPaiva(value, LaskuriTyyppi.NAHTAVILLAOLOKUULUTUKSEN_PAATTYMISPAIVA);
        //setValue("nahtavillaolo.siirtyyLainvoimaan", paattymispaiva);
      } catch (error) {
        showErrorMessage("Kuulutuksen päättymispäivän laskennassa tapahtui virhe");
        log.error("Nähtävilläolon päättymispäivän laskennassa virhe", error);
      }
      try {
        //const muistutuspaiva = await api.laskePaattymisPaiva(value, LaskuriTyyppi.MUISTUTUSTEN_PAATTYMISPAIVA);
        //setValue("nahtavillaolo.siirtyyLainvoimaan", paattymispaiva);
      } catch (error) {
        showErrorMessage("Muistutuspäivän laskennassa tapahtui virhe");
        log.error("Muistutuspäivän laskennassa virhe", error);
      }
    },
    [setValue, showErrorMessage]
  );

  return (
    <Section noDivider>
      <SectionContent>
        <h4 className="vayla-small-title">Kuulutus ja julkaisupäivä</h4>
        <p>
          Anna päivämäärä, jolle kuulutus päivätään ja nähtävilläolevan suunnitelman materiaalit julkaistaan palvelun
          julkisella puolella.
        </p>
        <HassuGrid cols={{ lg: 3 }}>
          <DatePicker
            label="Kuulutuspäivä *"
            className="md:max-w-min"
            //{...register("nahtavillaolo.kuulutusPaiva")}
            min={today}
            //error={errors.nahtavillaolo?.kuulutusPaiva}
            onChange={(event) => {
              getPaattymispaiva(event.target.value);
            }}
          />
          <DatePicker
            className="md:max-w-min"
            label="Kuulutusvaihe päättyy"
            readOnly
            //{...register("nahtavillaolo.siirtyyLainvoimaan")}
          />
        </HassuGrid>
      </SectionContent>
      <SectionContent>
        <h4 className="vayla-small-title">Muistutusten antaminen</h4>
        <p>
          Kansalaisten tulee muistuttaa suunnitelmasta järjestelmän kautta viimeistään alla olevana päivämääränä.
          Muistutusten päivämäärä määräytyy kuulutuksen nähtävilläoloajan mukaan, ja sitä ei voi muokata.
        </p>
        <DatePicker
          label="Muistutusoikeus päättyy"
          className="md:max-w-min"
          //{...register("nahtavillaolo.muistutusoikeusPaattyy")}
          min={today}
          //error={errors.nahtavillaolo?.muistutusoikeusPaattyy}
          readOnly
          onChange={(event) => {
            getPaattymispaiva(event.target.value);
          }}
        />
      </SectionContent>
    </Section>
  );
}
