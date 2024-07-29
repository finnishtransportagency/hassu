import { PreWrapParagraph } from "@components/PreWrapParagraph";
import Section from "@components/layout/Section";
import { Kielitiedot, UudelleenKuulutus } from "@services/api";
import { isKieliTranslatable, KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import React, { FunctionComponent } from "react";
import { label } from "src/util/textUtil";

export const UudelleenKuulutusSelitteetLukutila: FunctionComponent<{
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
      <p className="vayla-small-title">Uudelleenkuuluttamisen seloste</p>
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
