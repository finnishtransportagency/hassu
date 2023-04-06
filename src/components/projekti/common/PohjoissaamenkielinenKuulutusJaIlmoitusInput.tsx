import ContentSpacer from "@components/layout/ContentSpacer";
import Section from "@components/layout/Section2";
import { KuulutusPDFInput, LadattuTiedosto, TallennaProjektiInput } from "@services/api";
import React, { VFC } from "react";
import SaameTiedostoValitsin from "@components/projekti/common/SaameTiedostoValitsin";

type KuulutustenLuonnosVaiheet = Pick<
  TallennaProjektiInput,
  "aloitusKuulutus" | "nahtavillaoloVaihe" | "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe"
>;

export type SaameTiedostoMetodi =
  | "aloitusKuulutus.aloituskuulutusSaamePDFt"
  | "nahtavillaoloVaihe.nahtavillaoloSaamePDFt"
  | "hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt"
  | "jatkoPaatos1Vaihe.hyvaksymisPaatosVaiheSaamePDFt"
  | "jatkoPaatos2Vaihe.hyvaksymisPaatosVaiheSaamePDFt";

type SaameTiedostoLomakePolku = `${SaameTiedostoMetodi}.POHJOISSAAME.${keyof KuulutusPDFInput}`;

type Props = {
  saamePdfAvain: SaameTiedostoMetodi;
  ilmoitusTiedot: LadattuTiedosto | null | undefined;
  kuulutusTiedot: LadattuTiedosto | null | undefined;
};

const PohjoissaamenkielinenKuulutusJaIlmoitusInput: VFC<Props> = ({ saamePdfAvain: vaiheAvain, ilmoitusTiedot, kuulutusTiedot }) => {
  return (
    <Section>
      <h4 className="vayla-small-title">Saamenkielinen kuulutus ja ilmoitus *</h4>
      <ContentSpacer>
        <h5 className="vayla-smallest-title">Pohjoissaamenkielinen kuulutus</h5>
        <p>Tuo pdf-muotoinen pohjoissaamenkielinen kuulutus</p>
      </ContentSpacer>
      <SaameTiedostoValitsin name={`${vaiheAvain}.POHJOISSAAME.kuulutusPDFPath`} tiedosto={kuulutusTiedot} />
      <ContentSpacer>
        <h5 className="vayla-smallest-title">Pohjoissaamenkielinen ilmoitus</h5>
        <p>Tuo pdf-muotoinen pohjoissaamenkielinen ilmoitus</p>
      </ContentSpacer>
      <SaameTiedostoValitsin name={`${vaiheAvain}.POHJOISSAAME.kuulutusIlmoitusPDFPath`} tiedosto={ilmoitusTiedot} />
    </Section>
  );
};
export default PohjoissaamenkielinenKuulutusJaIlmoitusInput;
