import SectionContent from "@components/layout/SectionContent";
import { VuorovaikutusKierrosJulkaisu, Kielitiedot } from "@services/api";
import React, { ComponentProps, ReactElement } from "react";
import { formatDate } from "common/util/dateUtils";
import Section from "@components/layout/Section2";
import lowerCase from "lodash/lowerCase";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { PreWrapParagraph } from "@components/PreWrapParagraph";

interface Props {
  vuorovaikutus: VuorovaikutusKierrosJulkaisu;
  kielitiedot: Kielitiedot | null | undefined;
}

export default function VuorovaikutusPaivamaaraJaTiedotLukutila({
  vuorovaikutus,
  kielitiedot,
  ...sectionProps
}: Props & ComponentProps<typeof Section>): ReactElement {
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  return (
    <Section {...sectionProps}>
      <SectionContent>
        <p className="vayla-label">Julkaisupäivä</p>
        <p>{formatDate(vuorovaikutus?.vuorovaikutusJulkaisuPaiva)}</p>
      </SectionContent>
      {ensisijainenKaannettavaKieli && (
        <SectionContent>
          <p className="vayla-label">
            Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä ({lowerCase(ensisijainenKaannettavaKieli)})
          </p>
          <PreWrapParagraph>{vuorovaikutus?.hankkeenKuvaus?.[ensisijainenKaannettavaKieli]}</PreWrapParagraph>
        </SectionContent>
      )}
      {toissijainenKaannettavaKieli && (
        <SectionContent className="content">
          <p className="vayla-label">
            Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä ({lowerCase(toissijainenKaannettavaKieli)})
          </p>
          <PreWrapParagraph>{vuorovaikutus.hankkeenKuvaus?.[toissijainenKaannettavaKieli]}</PreWrapParagraph>
        </SectionContent>
      )}
    </Section>
  );
}
