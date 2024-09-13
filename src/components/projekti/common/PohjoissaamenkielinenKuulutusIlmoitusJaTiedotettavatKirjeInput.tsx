import ContentSpacer from "@components/layout/ContentSpacer";
import Section from "@components/layout/Section2";
import { LadattuTiedosto } from "@services/api";
import React, { FunctionComponent } from "react";
import SaameTiedostoValitsin, { TiedotettavaKuulutusTiedostotPrefix } from "@components/projekti/common/SaameTiedostoValitsin";
import { H2, H3 } from "../../Headings";

type Props = {
  saamePdfAvain: TiedotettavaKuulutusTiedostotPrefix;
  ilmoitusTiedot: LadattuTiedosto | null | undefined;
  kuulutusTiedot: LadattuTiedosto | null | undefined;
  kirjeTiedotettavilleTiedot: LadattuTiedosto | null | undefined;
};

const PohjoissaamenkielinenKuulutusJaIlmoitusInput: FunctionComponent<Props> = ({
  saamePdfAvain: vaiheAvain,
  ilmoitusTiedot,
  kuulutusTiedot,
  kirjeTiedotettavilleTiedot,
}) => {
  return (
    <Section>
      <H2>Saamenkieliset tiedostot *</H2>
      <ContentSpacer>
        <H3>Pohjoissaamenkielinen kuulutus</H3>
        <p>Tuo pdf-muotoinen pohjoissaamenkielinen kuulutus</p>
      </ContentSpacer>
      <SaameTiedostoValitsin name={`${vaiheAvain}.POHJOISSAAME.kuulutusPDFPath`} tiedosto={kuulutusTiedot} />
      <ContentSpacer>
        <H3>Pohjoissaamenkielinen ilmoitus</H3>
        <p>Tuo pdf-muotoinen pohjoissaamenkielinen ilmoitus</p>
      </ContentSpacer>
      <SaameTiedostoValitsin name={`${vaiheAvain}.POHJOISSAAME.kuulutusIlmoitusPDFPath`} tiedosto={ilmoitusTiedot} />
      <ContentSpacer>
        <H3>Kirje kiinteistönomistajille{vaiheAvain !== "nahtavillaoloVaihe.nahtavillaoloSaamePDFt" ? " ja muistuttajille" : null}</H3>
        <p>
          Tuo pdf-muotoinen kirje kiinteistönomistajille
          {vaiheAvain !== "nahtavillaoloVaihe.nahtavillaoloSaamePDFt" ? " ja muistuttajille" : null}
        </p>
      </ContentSpacer>
      <SaameTiedostoValitsin name={`${vaiheAvain}.POHJOISSAAME.kirjeTiedotettavillePDFPath`} tiedosto={kirjeTiedotettavilleTiedot} />
    </Section>
  );
};
export default PohjoissaamenkielinenKuulutusJaIlmoitusInput;
