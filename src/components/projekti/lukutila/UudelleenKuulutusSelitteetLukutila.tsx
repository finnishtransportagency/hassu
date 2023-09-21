import { PreWrapParagraph } from "@components/PreWrapParagraph";
import Section from "@components/layout/Section";
import { Kieli, UudelleenKuulutus } from "@services/api";
import { isKieliTranslatable, KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import lowerCase from "lodash/lowerCase";
import React, { VoidFunctionComponent } from "react";

export const UudelleenKuulutusSelitteetLukutila: VoidFunctionComponent<{
  ensisijainenKieli: Kieli | null | undefined;
  toissijainenKieli: Kieli | null | undefined;
  uudelleenKuulutus: UudelleenKuulutus;
}> = ({ uudelleenKuulutus, ensisijainenKieli, toissijainenKieli }) => {
  const ensisijainenKaannettavaKieli: KaannettavaKieli | null = isKieliTranslatable(ensisijainenKieli)
    ? (ensisijainenKieli as KaannettavaKieli)
    : null;
  const toissijainenKaannettavaKieli: KaannettavaKieli | null = isKieliTranslatable(toissijainenKieli)
    ? (toissijainenKieli as KaannettavaKieli)
    : null;
  return (
    <Section>
      <p className="vayla-small-title">Uudelleenkuuluttamisen seloste</p>
      {uudelleenKuulutus.selosteLahetekirjeeseen && (
        <>
          {ensisijainenKaannettavaKieli && (
            <div>
              <p className="vayla-label">Seloste lähetekirjeeseen ensisijaisella kielellä ({lowerCase(ensisijainenKaannettavaKieli)})</p>
              <PreWrapParagraph>{uudelleenKuulutus.selosteLahetekirjeeseen?.[ensisijainenKaannettavaKieli]}</PreWrapParagraph>
            </div>
          )}
          {toissijainenKaannettavaKieli && (
            <div>
              <p className="vayla-label">Seloste lähetekirjeeseen toissijaisella kielellä ({lowerCase(toissijainenKaannettavaKieli)})</p>
              <PreWrapParagraph>{uudelleenKuulutus.selosteLahetekirjeeseen?.[toissijainenKaannettavaKieli]}</PreWrapParagraph>
            </div>
          )}
        </>
      )}
      {uudelleenKuulutus.selosteKuulutukselle && (
        <>
          {ensisijainenKaannettavaKieli && (
            <div>
              <p className="vayla-label">Seloste kuulutukselle ensisijaisella kielellä ({lowerCase(ensisijainenKaannettavaKieli)})</p>
              <PreWrapParagraph>{uudelleenKuulutus.selosteKuulutukselle?.[ensisijainenKaannettavaKieli]}</PreWrapParagraph>
            </div>
          )}
          {toissijainenKaannettavaKieli && (
            <div>
              <p className="vayla-label">Seloste kuulutukselle toissijaisella kielellä ({lowerCase(toissijainenKaannettavaKieli)})</p>
              <PreWrapParagraph>{uudelleenKuulutus.selosteKuulutukselle?.[toissijainenKaannettavaKieli]}</PreWrapParagraph>
            </div>
          )}
        </>
      )}
    </Section>
  );
};
