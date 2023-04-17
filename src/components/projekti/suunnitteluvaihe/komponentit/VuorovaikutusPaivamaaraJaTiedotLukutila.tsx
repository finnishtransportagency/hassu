import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { VuorovaikutusKierrosJulkaisu, AloitusKuulutusJulkaisu } from "@services/api";
import React, { ReactElement } from "react";
import { formatDate } from "common/util/dateUtils";
import lowerCase from "lodash/lowerCase";
import { getKaannettavatKielet } from "common/kaannettavatKielet";

interface Props {
  vuorovaikutus: VuorovaikutusKierrosJulkaisu;
  aloituskuulutusjulkaisu: AloitusKuulutusJulkaisu;
}

export default function VuorovaikutusPaivamaaraJaTiedotLukutila({ vuorovaikutus, aloituskuulutusjulkaisu }: Props): ReactElement {
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(aloituskuulutusjulkaisu?.kielitiedot);

  return (
    <Section>
      <SectionContent>
        <p className="vayla-label">Julkaisupäivä</p>
        <p>{formatDate(vuorovaikutus?.vuorovaikutusJulkaisuPaiva)}</p>
      </SectionContent>
      {ensisijainenKaannettavaKieli && (
        <SectionContent>
          <p className="vayla-label">
            Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä ({lowerCase(ensisijainenKaannettavaKieli)})
          </p>
          <p>{aloituskuulutusjulkaisu?.hankkeenKuvaus?.[ensisijainenKaannettavaKieli]}</p>
        </SectionContent>
      )}
      {toissijainenKaannettavaKieli && (
        <SectionContent className="content">
          <p className="vayla-label">
            Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä ({lowerCase(toissijainenKaannettavaKieli)})
          </p>
          <p>{aloituskuulutusjulkaisu.hankkeenKuvaus?.[toissijainenKaannettavaKieli]}</p>
        </SectionContent>
      )}
    </Section>
  );
}
