import { PreWrapParagraph } from "@components/PreWrapParagraph";
import Section from "@components/layout/Section";
import { Kielitiedot, UudelleenKuulutus } from "@services/api";
import { isKieliTranslatable, KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import React, { VoidFunctionComponent } from "react";
import { label } from "src/util/textUtil";
import { H3 } from "../../Headings";

export const UudelleenKuulutusSelitteetLukutila: VoidFunctionComponent<{
  kielitiedot: Kielitiedot;
  uudelleenKuulutus: UudelleenKuulutus;
}> = ({ uudelleenKuulutus, kielitiedot }) => {
  const { ensisijainenKieli, toissijainenKieli } = kielitiedot;
  const ensisijainenKaannettavaKieli: KaannettavaKieli | null = isKieliTranslatable(ensisijainenKieli)
    ? (ensisijainenKieli as KaannettavaKieli)
    : null;
  const toissijainenKaannettavaKieli: KaannettavaKieli | null = isKieliTranslatable(toissijainenKieli)
    ? (toissijainenKieli as KaannettavaKieli)
    : null;
  return (
    <Section>
      <H3>Uudelleenkuuluttamisen seloste</H3>
      {uudelleenKuulutus.selosteLahetekirjeeseen && (
        <>
          {ensisijainenKaannettavaKieli && (
            <div>
              <p className="vayla-label">
                {label({
                  label: "Seloste lähetekirjeeseen",
                  inputLanguage: ensisijainenKaannettavaKieli,
                  kielitiedot,
                })}
              </p>
              <PreWrapParagraph>{uudelleenKuulutus.selosteLahetekirjeeseen?.[ensisijainenKaannettavaKieli]}</PreWrapParagraph>
            </div>
          )}
          {toissijainenKaannettavaKieli && (
            <div>
              <p className="vayla-label">
                {label({
                  label: "Seloste lähetekirjeeseen",
                  inputLanguage: toissijainenKaannettavaKieli,
                  kielitiedot,
                })}
              </p>
              <PreWrapParagraph>{uudelleenKuulutus.selosteLahetekirjeeseen?.[toissijainenKaannettavaKieli]}</PreWrapParagraph>
            </div>
          )}
        </>
      )}
      {uudelleenKuulutus.selosteKuulutukselle && (
        <>
          {ensisijainenKaannettavaKieli && (
            <div>
              <p className="vayla-label">
                {label({
                  label: "Seloste kuulutukselle",
                  inputLanguage: ensisijainenKaannettavaKieli,
                  kielitiedot,
                })}
              </p>
              <PreWrapParagraph>{uudelleenKuulutus.selosteKuulutukselle?.[ensisijainenKaannettavaKieli]}</PreWrapParagraph>
            </div>
          )}
          {toissijainenKaannettavaKieli && (
            <div>
              <p className="vayla-label">
                {label({
                  label: "Seloste kuulutukselle",
                  inputLanguage: toissijainenKaannettavaKieli,
                  kielitiedot,
                })}
              </p>
              <PreWrapParagraph>{uudelleenKuulutus.selosteKuulutukselle?.[toissijainenKaannettavaKieli]}</PreWrapParagraph>
            </div>
          )}
        </>
      )}
    </Section>
  );
};
