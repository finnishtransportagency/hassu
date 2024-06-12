import ContentSpacer from "@components/layout/ContentSpacer";
import Section from "@components/layout/Section2";
import { LadattuTiedosto } from "@services/api";
import React, { VFC } from "react";
import SaameTiedostoValitsin, { SaameKuulutusTiedostotMetodi } from "@components/projekti/common/SaameTiedostoValitsin";

type Props = {
  saamePdfAvain: SaameKuulutusTiedostotMetodi;
  ilmoitusTiedot: LadattuTiedosto | null | undefined;
  kuulutusTiedot: LadattuTiedosto | null | undefined;
};

const PohjoissaamenkielinenKuulutusJaIlmoitusInput: VFC<Props> = ({ saamePdfAvain: vaiheAvain, ilmoitusTiedot, kuulutusTiedot }) => {
  return (
    <Section>
      <h2 className="vayla-title">Saamenkielinen kuulutus ja ilmoitus *</h2>
      <ContentSpacer>
        <h3 className="vayla-subtitle">Pohjoissaamenkielinen kuulutus</h3>
        <p>Tuo pdf-muotoinen pohjoissaamenkielinen kuulutus</p>
      </ContentSpacer>
      <SaameTiedostoValitsin name={`${vaiheAvain}.POHJOISSAAME.kuulutusPDFPath`} tiedosto={kuulutusTiedot} />
      <ContentSpacer>
        <h3 className="vayla-subtitle">Pohjoissaamenkielinen ilmoitus</h3>
        <p>Tuo pdf-muotoinen pohjoissaamenkielinen ilmoitus</p>
      </ContentSpacer>
      <SaameTiedostoValitsin name={`${vaiheAvain}.POHJOISSAAME.kuulutusIlmoitusPDFPath`} tiedosto={ilmoitusTiedot} />
    </Section>
  );
};
export default PohjoissaamenkielinenKuulutusJaIlmoitusInput;
