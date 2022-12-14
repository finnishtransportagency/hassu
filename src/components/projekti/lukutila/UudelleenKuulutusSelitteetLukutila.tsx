import Section from "@components/layout/Section";
import { Kieli, UudelleenKuulutus } from "@services/api";
import lowerCase from "lodash/lowerCase";
import React, { VoidFunctionComponent } from "react";

export const UudelleenKuulutusSelitteetLukutila: VoidFunctionComponent<{
  ensisijainenKieli: Kieli | null | undefined;
  toissijainenKieli: Kieli | null | undefined;
  uudelleenKuulutus: UudelleenKuulutus;
}> = ({ uudelleenKuulutus, ensisijainenKieli, toissijainenKieli }) => (
  <Section>
    <p className="vayla-small-title">Uudelleenkuuluttamisen seloste</p>
    {uudelleenKuulutus.selosteLahetekirjeeseen && (
      <>
        {ensisijainenKieli && (
          <div>
            <p className="vayla-label">Seloste lähetekirjeeseen ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
            <p>{uudelleenKuulutus.selosteLahetekirjeeseen?.[ensisijainenKieli]}</p>
          </div>
        )}
        {toissijainenKieli && (
          <div>
            <p className="vayla-label">Seloste lähetekirjeeseen toissijaisella kielellä ({lowerCase(toissijainenKieli)})</p>
            <p>{uudelleenKuulutus.selosteLahetekirjeeseen?.[toissijainenKieli]}</p>
          </div>
        )}
      </>
    )}
    {uudelleenKuulutus.selosteKuulutukselle && (
      <>
        {ensisijainenKieli && (
          <div>
            <p className="vayla-label">Seloste kuulutukselle ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
            <p>{uudelleenKuulutus.selosteKuulutukselle?.[ensisijainenKieli]}</p>
          </div>
        )}
        {toissijainenKieli && (
          <div>
            <p className="vayla-label">Seloste kuulutukselle toissijaisella kielellä ({lowerCase(toissijainenKieli)})</p>
            <p>{uudelleenKuulutus.selosteKuulutukselle?.[toissijainenKieli]}</p>
          </div>
        )}
      </>
    )}
  </Section>
);
