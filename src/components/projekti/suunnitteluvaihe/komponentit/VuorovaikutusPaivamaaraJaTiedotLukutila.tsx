import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { VuorovaikutusKierrosJulkaisu, Kieli, AloitusKuulutusJulkaisu } from "@services/api";
import React, { ReactElement } from "react";
import { formatDate } from "src/util/dateUtils";
import lowerCase from "lodash/lowerCase";

interface Props {
  vuorovaikutus: VuorovaikutusKierrosJulkaisu;
  aloituskuulutusjulkaisu: AloitusKuulutusJulkaisu;
}

export default function VuorovaikutusPaivamaaraJaTiedotLukutila({ vuorovaikutus, aloituskuulutusjulkaisu }: Props): ReactElement {
  const ensisijainenKieli = aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli || Kieli.SUOMI;
  const toissijainenKieli = aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli || Kieli.RUOTSI;

  return (
    <Section>
      <SectionContent>
        <p className="vayla-label">Julkaisupäivä</p>
        <p>{formatDate(vuorovaikutus?.vuorovaikutusJulkaisuPaiva)}</p>
      </SectionContent>
      <SectionContent>
        <p className="vayla-label">Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
        <p>{aloituskuulutusjulkaisu?.hankkeenKuvaus?.[ensisijainenKieli]}</p>
      </SectionContent>
      {aloituskuulutusjulkaisu.kielitiedot?.toissijainenKieli && (
        <SectionContent className="content">
          <p className="vayla-label">Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä ({lowerCase(toissijainenKieli)})</p>
          <p>{aloituskuulutusjulkaisu.hankkeenKuvaus?.[toissijainenKieli]}</p>
        </SectionContent>
      )}
    </Section>
  );
}
