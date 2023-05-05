import SectionContent from "@components/layout/SectionContent";
import { VuorovaikutusKierrosJulkaisu, Kielitiedot } from "@services/api";
import React, { ComponentProps, ReactElement } from "react";
import { formatDate } from "common/util/dateUtils";
import Section from "@components/layout/Section2";
import lowerCase from "lodash/lowerCase";
import { getKaannettavatKielet } from "common/kaannettavatKielet";

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
          <p>{vuorovaikutus?.hankkeenKuvaus?.[ensisijainenKaannettavaKieli]}</p>
        </SectionContent>
      )}
      {toissijainenKaannettavaKieli && (
        <SectionContent className="content">
          <p className="vayla-label">
            Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä ({lowerCase(toissijainenKaannettavaKieli)})
          </p>
          <p>{vuorovaikutus.hankkeenKuvaus?.[toissijainenKaannettavaKieli]}</p>
        </SectionContent>
      )}
    </Section>
  );
}
