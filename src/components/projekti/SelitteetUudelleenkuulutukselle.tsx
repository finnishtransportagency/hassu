import Textarea from "@components/form/Textarea";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { Kielitiedot, TallennaProjektiInput, UudelleenKuulutus, UudelleenkuulutusTila } from "@services/api";
import { getKaannettavatKielet } from "hassu-common/kaannettavatKielet";
import React from "react";
import { useFormContext } from "react-hook-form";
import { label } from "src/util/textUtil";

type TallennaProjektiInputAvain = keyof Pick<TallennaProjektiInput, "aloitusKuulutus" | "nahtavillaoloVaihe"> | "paatos";

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
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot) || {};
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
              {ensisijainenKaannettavaKieli && (
                <Textarea
                  label={label({
                    label: `Suunnitelman uudelleenkuuluttamisen syy`,
                    inputLanguage: ensisijainenKaannettavaKieli,
                    toissijainenKieli: toissijainenKaannettavaKieli,
                    required: true,
                  })}
                  {...register(`${vaiheenAvain}.uudelleenKuulutus.selosteKuulutukselle.${ensisijainenKaannettavaKieli}`)}
                  error={(errors[vaiheenAvain]?.uudelleenKuulutus as any)?.selosteKuulutukselle?.[ensisijainenKaannettavaKieli]}
                  disabled={disabled}
                />
              )}
              {toissijainenKaannettavaKieli && (
                <Textarea
                  label={label({
                    label: `Suunnitelman uudelleenkuuluttamisen syy`,
                    inputLanguage: toissijainenKaannettavaKieli,
                    toissijainenKieli: toissijainenKaannettavaKieli,
                    required: true,
                  })}
                  {...register(`${vaiheenAvain}.uudelleenKuulutus.selosteKuulutukselle.${toissijainenKaannettavaKieli}`)}
                  error={(errors[vaiheenAvain]?.uudelleenKuulutus as any)?.selosteKuulutukselle?.[toissijainenKaannettavaKieli]}
                  disabled={disabled}
                />
              )}
            </SectionContent>
          )}
          <SectionContent>
            <h6 className="vayla-smallest-title">Seloste lähetekirjeeseen</h6>
            <p>
              Kirjoita lähetekirjettä varten seloste uudelleenkuuluttamisen syistä. Seloste tulee nähtäville viranomaiselle ja kunnille
              lähetettävän lähetetekstin alkuun. Älä lisää tekstiin linkkejä.
            </p>
            {ensisijainenKaannettavaKieli && (
              <Textarea
                label={label({
                  label: `Suunnitelman uudelleenkuuluttamisen syy`,
                  inputLanguage: ensisijainenKaannettavaKieli,
                  toissijainenKieli: toissijainenKaannettavaKieli,
                  required: true,
                })}
                {...register(`${vaiheenAvain}.uudelleenKuulutus.selosteLahetekirjeeseen.${ensisijainenKaannettavaKieli}`)}
                error={(errors[vaiheenAvain]?.uudelleenKuulutus as any)?.selosteLahetekirjeeseen?.[ensisijainenKaannettavaKieli]}
                disabled={disabled}
              />
            )}
            {toissijainenKaannettavaKieli && (
              <Textarea
                label={label({
                  label: `Suunnitelman uudelleenkuuluttamisen syy`,
                  inputLanguage: toissijainenKaannettavaKieli,
                  toissijainenKieli: toissijainenKaannettavaKieli,
                  required: true,
                })}
                {...register(`${vaiheenAvain}.uudelleenKuulutus.selosteLahetekirjeeseen.${toissijainenKaannettavaKieli}`)}
                error={(errors[vaiheenAvain]?.uudelleenKuulutus as any)?.selosteLahetekirjeeseen?.[toissijainenKaannettavaKieli]}
                disabled={disabled}
              />
            )}
          </SectionContent>
        </Section>
      )}
    </>
  );
}
