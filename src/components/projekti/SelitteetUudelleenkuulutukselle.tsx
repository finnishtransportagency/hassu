import Textarea from "@components/form/Textarea";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { Kielitiedot, TallennaProjektiInput, UudelleenKuulutus, UudelleenkuulutusTila } from "@services/api";
import lowerCase from "lodash/lowerCase";
import React from "react";
import { useFormContext } from "react-hook-form";

type TallennaProjektiInputAvain = keyof Pick<TallennaProjektiInput, "aloitusKuulutus" | "nahtavillaoloVaihe">;

type Props = {
  uudelleenKuulutus: UudelleenKuulutus | null | undefined;
  kielitiedot: Kielitiedot | null | undefined;
  disabled: boolean;
  vaiheenAvain: TallennaProjektiInputAvain;
};

export default function SelitteetUudelleenkuulutukselle({ uudelleenKuulutus, kielitiedot, disabled, vaiheenAvain }: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { ensisijainenKieli, toissijainenKieli } = kielitiedot || {};
  return (
    <>
      {uudelleenKuulutus && (
        <Section>
          <h5 className="vayla-small-title">Uudelleenkuuluttamisen seloste</h5>
          {uudelleenKuulutus.tila === UudelleenkuulutusTila.JULKAISTU_PERUUTETTU && (
            <SectionContent>
              <h6 className="vayla-smallest-title">Seloste kuulutukselle</h6>
              <p>
                Kirjoita kuulutusta varten seloste uudelleenkuuluttamisen syistä. Seloste tulee nähtäville palvelun julkiselle puolelle sekä
                kuulutuksen pdf-tiedostoon. Älä lisää tekstiin linkkejä.
              </p>
              {ensisijainenKieli && (
                <Textarea
                  label={`Suunnitelman uudelleenkuuluttamisen syy ensisijaisella kielellä (${lowerCase(ensisijainenKieli)}) *`}
                  {...register(`${vaiheenAvain}.uudelleenKuulutus.selosteKuulutukselle.${ensisijainenKieli}`)}
                  error={(errors[vaiheenAvain]?.uudelleenKuulutus as any)?.selosteKuulutukselle?.[ensisijainenKieli]}
                  disabled={disabled}
                />
              )}
              {toissijainenKieli && (
                <Textarea
                  label={`Suunnitelman uudelleenkuuluttamisen syy toissijaisella kielellä (${lowerCase(toissijainenKieli)}) *`}
                  {...register(`${vaiheenAvain}.uudelleenKuulutus.selosteKuulutukselle.${toissijainenKieli}`)}
                  error={(errors[vaiheenAvain]?.uudelleenKuulutus as any)?.selosteKuulutukselle?.[toissijainenKieli]}
                  disabled={disabled}
                />
              )}
            </SectionContent>
          )}
          <SectionContent>
            <h6 className="vayla-smallest-title">Seloste lähetekirjeeseen</h6>
            <p>
              Kirjoita lähetekirjettä varten seloste uudelleenkuuluttamisen syistä. Seloste tulee nähtäville viranomaiselle ja kunnille
              lähetettävän lähetekirjeen alkuun. Älä lisää tekstiin linkkejä.
            </p>
            {ensisijainenKieli && (
              <Textarea
                label={`Suunnitelman uudelleenkuuluttamisen syy ensisijaisella kielellä (${lowerCase(ensisijainenKieli)}) *`}
                {...register(`${vaiheenAvain}.uudelleenKuulutus.selosteLahetekirjeeseen.${ensisijainenKieli}`)}
                error={(errors[vaiheenAvain]?.uudelleenKuulutus as any)?.selosteLahetekirjeeseen?.[ensisijainenKieli]}
                disabled={disabled}
              />
            )}
            {toissijainenKieli && (
              <Textarea
                label={`Suunnitelman uudelleenkuuluttamisen syy toissijaisella kielellä (${lowerCase(toissijainenKieli)}) *`}
                {...register(`${vaiheenAvain}.uudelleenKuulutus.selosteLahetekirjeeseen.${toissijainenKieli}`)}
                error={(errors[vaiheenAvain]?.uudelleenKuulutus as any)?.selosteLahetekirjeeseen?.[toissijainenKieli]}
                disabled={disabled}
              />
            )}
          </SectionContent>
        </Section>
      )}
    </>
  );
}
