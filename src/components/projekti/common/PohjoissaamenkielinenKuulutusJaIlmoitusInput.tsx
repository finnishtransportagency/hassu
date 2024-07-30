import ContentSpacer from "@components/layout/ContentSpacer";
import Section from "@components/layout/Section2";
import { LadattuTiedosto } from "@services/api";
import React, { FunctionComponent } from "react";
import SaameTiedostoValitsin, { SaameKuulutusTiedostotMetodi } from "@components/projekti/common/SaameTiedostoValitsin";
import { H2, H3 } from "../../Headings";

type Props = {
  saamePdfAvain: SaameKuulutusTiedostotMetodi;
  ilmoitusTiedot: LadattuTiedosto | null | undefined;
  kuulutusTiedot: LadattuTiedosto | null | undefined;
};

const PohjoissaamenkielinenKuulutusJaIlmoitusInput: FunctionComponent<Props> = ({
  saamePdfAvain: vaiheAvain,
  ilmoitusTiedot,
  kuulutusTiedot,
}) => {
  return (
    <Section>
      <H2>Saamenkielinen kuulutus ja ilmoitus *</H2>
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
    </Section>
  );
};
export default PohjoissaamenkielinenKuulutusJaIlmoitusInput;
