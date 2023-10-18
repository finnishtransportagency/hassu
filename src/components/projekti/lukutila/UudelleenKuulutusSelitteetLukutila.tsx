import { PreWrapParagraph } from "@components/PreWrapParagraph";
import Section from "@components/layout/Section";
import { Kieli, UudelleenKuulutus } from "@services/api";
import { isKieliTranslatable, KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import React, { VoidFunctionComponent } from "react";
import { label } from "src/util/textUtil";

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
              <p className="vayla-label">
                {label({
                  label: "Seloste lähetekirjeeseen",
                  inputLanguage: ensisijainenKaannettavaKieli,
                  toissijainenKieli: toissijainenKaannettavaKieli,
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
                  toissijainenKieli: toissijainenKaannettavaKieli,
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
                  toissijainenKieli: toissijainenKaannettavaKieli,
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
                  toissijainenKieli: toissijainenKaannettavaKieli,
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
