import SectionContent from "@components/layout/SectionContent";
import { useFormContext } from "react-hook-form";
import {
  Projekti,
  Kieli
} from "@services/api";
import React, { ReactElement, useMemo } from "react";
import DatePicker from "@components/form/DatePicker";
import { formatDate } from "src/util/dateUtils";
import dayjs from "dayjs";
import lowerCase from "lodash/lowerCase";



interface Props {
  projekti?: Projekti | null;
  vuorovaikutusnro: number | null | undefined;
}

type FormFields = {
  suunnitteluVaihe: {
    vuorovaikutus: {
      vuorovaikutusJulkaisuPaiva: string | null,
      kysymyksetJaPalautteetViimeistaan: string | null;
    }
  };
};

export default function SuunnitteluvaiheenVuorovaikuttaminen({
  projekti,
  vuorovaikutusnro
}: Props): ReactElement {

  const {
    register,
    formState: { errors }
  } = useFormContext<FormFields>();

  const today = dayjs().format();

  const v = useMemo(() => {
    return projekti?.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
      return v.vuorovaikutusNumero === vuorovaikutusnro;
    });
  }, [projekti, vuorovaikutusnro]);

  const aloituskuulutusjulkaisu = useMemo(() => {
    return projekti?.aloitusKuulutusJulkaisut?.[projekti?.aloitusKuulutusJulkaisut?.length - 1 || 0];
  }, [projekti]);

  const ensisijainenKieli = aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli || Kieli.SUOMI;
  const toissijainenKieli = aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli || Kieli.RUOTSI;

  const julkinen = v?.julkinen;


  if (!projekti) {
    return <></>;
  }

  if (julkinen && aloituskuulutusjulkaisu) {
    return (
      <>
        <SectionContent>
          <p className="vayla-label">Julkaisupäivä</p>
          <p>
            {formatDate(v?.vuorovaikutusJulkaisuPaiva)}
          </p>
        </SectionContent>
        <SectionContent>
          <p className="vayla-label">
            Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä (
            {lowerCase(ensisijainenKieli)})
          </p>
          <p>
            {projekti?.aloitusKuulutus?.hankkeenKuvaus?.[ensisijainenKieli]}
          </p>
        </SectionContent>
        {aloituskuulutusjulkaisu.kielitiedot?.toissijainenKieli && (
          <SectionContent className="content">
            <p className="vayla-label">
              Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (
              {lowerCase(toissijainenKieli)})
            </p>
            <p>
              {projekti?.aloitusKuulutus?.hankkeenKuvaus?.[toissijainenKieli]}
            </p>
          </SectionContent>
        )}
        <SectionContent>
          <p className="vayla-label">
            Kysymykset ja palautteet
          </p>
          <p>
            Kansalaisia pyydetään esittämään kysymykset ja palautteet viimeistään   {formatDate(v?.kysymyksetJaPalautteetViimeistaan)}.
          </p>
        </SectionContent>
      </>
    );
  }

  return (
    <>
      <SectionContent>
        <h4 className="vayla-small-title">Julkaisupäivä</h4>
        <p>
          Anna päivämäärä, jolloin vuorovaikutusosio palvelun julkisella puolella ja kutsu vuorovaikutukseen
          muilla ilmoituskanavilla julkaistaan.
        </p>
        <DatePicker
          label="Julkaisupäivä *"
          className="md:max-w-min"
          {...register("suunnitteluVaihe.vuorovaikutus.vuorovaikutusJulkaisuPaiva")}
          min={today}
          error={errors.suunnitteluVaihe?.vuorovaikutus?.vuorovaikutusJulkaisuPaiva}
        />
      </SectionContent>
      <SectionContent>
        <h4 className="vayla-small-title">Kysymyksien esittäminen ja palautteiden antaminen</h4>
        <p>Anna päivämäärä, johon mennessä kansalaisten toivotaan esittävän kysymykset ja palautteet.</p>
        <DatePicker
          label="Kysymykset ja palautteet viimeistään *"
          className="md:max-w-min"
          {...register("suunnitteluVaihe.vuorovaikutus.kysymyksetJaPalautteetViimeistaan")}
          min={today}
          error={errors.suunnitteluVaihe?.vuorovaikutus?.kysymyksetJaPalautteetViimeistaan}
        />
      </SectionContent>
    </>
  );

}
