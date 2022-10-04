import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { Projekti, Kieli } from "@services/api";
import React, { ReactElement, useMemo } from "react";
import { formatDate, today } from "src/util/dateUtils";
import lowerCase from "lodash/lowerCase";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { VuorovaikutusFormValues } from "./SuunnitteluvaiheenVuorovaikuttaminen";

interface Props {
  projekti?: Projekti | null;
  vuorovaikutusnro: number | null | undefined;
}

export default function SuunnitteluvaiheenVuorovaikuttaminen({ projekti, vuorovaikutusnro }: Props): ReactElement {
  const v = useMemo(() => {
    return projekti?.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
      return v.vuorovaikutusNumero === vuorovaikutusnro;
    });
  }, [projekti, vuorovaikutusnro]);

  const aloituskuulutusjulkaisu = useMemo(() => {
    return projekti?.aloitusKuulutusJulkaisut?.[projekti?.aloitusKuulutusJulkaisut?.length - 1 || 0];
  }, [projekti]);

  const ensisijainenKieli = aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli || Kieli.SUOMI;
  const toissijainenKieli = aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli || Kieli.RUOTSI;

  const julkinen = v?.julkinen;

  if (!projekti) {
    return <></>;
  }

  if (julkinen && aloituskuulutusjulkaisu) {
    return (
      <Section noDivider>
        <SectionContent>
          <p className="vayla-label">Julkaisupäivä</p>
          <p>{formatDate(v?.vuorovaikutusJulkaisuPaiva)}</p>
        </SectionContent>
        <SectionContent>
          <p className="vayla-label">Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
          <p>{projekti?.aloitusKuulutus?.hankkeenKuvaus?.[ensisijainenKieli]}</p>
        </SectionContent>
        {aloituskuulutusjulkaisu.kielitiedot?.toissijainenKieli && (
          <SectionContent className="content">
            <p className="vayla-label">Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä ({lowerCase(toissijainenKieli)})</p>
            <p>{projekti?.aloitusKuulutus?.hankkeenKuvaus?.[toissijainenKieli]}</p>
          </SectionContent>
        )}
        <SectionContent className="pb-7">
          <p className="vayla-label">Kysymykset ja palautteet</p>
          <p>Kansalaisia pyydetään esittämään kysymykset ja palautteet viimeistään {formatDate(v?.kysymyksetJaPalautteetViimeistaan)}.</p>
        </SectionContent>
      </Section>
    );
  }

  return (
    <>
      <SectionContent>
        <h4 className="vayla-small-title">Julkaisupäivä</h4>
        <p>
          Anna päivämäärä, jolloin vuorovaikutusosio palvelun julkisella puolella ja kutsu vuorovaikutukseen muilla ilmoituskanavilla
          julkaistaan.
        </p>
        <HassuDatePickerWithController<VuorovaikutusFormValues>
          label="Julkaisupäivä"
          minDate={today()}
          textFieldProps={{ required: true }}
          controllerProps={{ name: "suunnitteluVaihe.vuorovaikutus.vuorovaikutusJulkaisuPaiva" }}
        />
      </SectionContent>
      <SectionContent>
        <h4 className="vayla-small-title">Kysymyksien esittäminen ja palautteiden antaminen</h4>
        <p>Anna päivämäärä, johon mennessä kansalaisten toivotaan esittävän kysymykset ja palautteet.</p>
        <HassuDatePickerWithController<VuorovaikutusFormValues>
          label="Kysymykset ja palautteet viimeistään"
          minDate={today()}
          textFieldProps={{
            required: true,
            sx: { maxWidth: { md: "min-content" } },
          }}
          controllerProps={{ name: "suunnitteluVaihe.vuorovaikutus.kysymyksetJaPalautteetViimeistaan" }}
        />
      </SectionContent>
    </>
  );
}
