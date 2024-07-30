import ContentSpacer from "@components/layout/ContentSpacer";
import Section from "@components/layout/Section2";
import { LadattuTiedosto } from "@services/api";
import React, { FunctionComponent } from "react";
import SaameTiedostoValitsin from "@components/projekti/common/SaameTiedostoValitsin";

export type SaameKutsuTiedostoMetodi = "vuorovaikutusKierros.vuorovaikutusSaamePDFt";

type Props = {
  kutsuTiedot: LadattuTiedosto | null | undefined;
};

const PohjoissaamenkielinenKutsuInput: FunctionComponent<Props> = ({ kutsuTiedot }) => {
  return (
    <Section>
      <h4 className="vayla-small-title">Saamenkielinen kutsu vuorovaikutukseen *</h4>
      <ContentSpacer>
        <h5 className="vayla-smallest-title">Pohjoissaamenkielinen kutsu</h5>
        <p>Tuo valmis pdf-muotoinen saamenkielinen kutsu</p>
      </ContentSpacer>
      <SaameTiedostoValitsin name={`vuorovaikutusKierros.vuorovaikutusSaamePDFt.POHJOISSAAME`} tiedosto={kutsuTiedot} />
    </Section>
  );
};

export default PohjoissaamenkielinenKutsuInput;
