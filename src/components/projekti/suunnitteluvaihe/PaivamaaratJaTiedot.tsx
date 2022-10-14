import SectionContent from "@components/layout/SectionContent";
import { Projekti } from "@services/api";
import React, { ReactElement, useMemo } from "react";
import { today } from "src/util/dateUtils";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { VuorovaikutusFormValues } from "./SuunnitteluvaiheenVuorovaikuttaminen";
import VuorovaikutusPaivamaaraJaTiedotLukutila from "../lukutila/komponentit/VuorovaikutusPaivamaaraJaTiedotLukutila";

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

  const julkinen = v?.julkinen;

  if (!projekti) {
    return <></>;
  }

  if (julkinen && aloituskuulutusjulkaisu) {
    return <VuorovaikutusPaivamaaraJaTiedotLukutila aloituskuulutusjulkaisu={aloituskuulutusjulkaisu} vuorovaikutus={v} />;
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
