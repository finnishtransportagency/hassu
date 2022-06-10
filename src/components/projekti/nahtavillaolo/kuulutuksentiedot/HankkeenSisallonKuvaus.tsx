import Textarea from "@components/form/Textarea";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { HankkeenKuvauksetInput, Kielitiedot, Kieli } from "@services/api";
import React from "react";
import { useFormContext } from "react-hook-form";
import lowerCase from "lodash/lowerCase";

type Props = {
  kielitiedot: Kielitiedot | null | undefined;
};

type FormFields = {
  nahtavillaoloVaihe: {
    hankkeenKuvaus: HankkeenKuvauksetInput;
  };
};

export default function KuulutusJaJulkaisuPaiva({ kielitiedot }: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormFields>();

  const ensisijainenKieli = kielitiedot?.ensisijainenKieli || Kieli.SUOMI;
  const toissijainenKieli = kielitiedot?.toissijainenKieli;

  return (
    <Section noDivider>
      <SectionContent>
        <h4 className="vayla-small-title">Hankkeen sisällönkuvaus</h4>
        <p>
          Kirjoita nähtäville asettamisen kuulutusta varten tiivistetty sisällönkuvaus hankkeesta. Kuvauksen on hyvä
          sisältää esimerkiksi tieto suunnittelukohteen alueellista rajauksesta (maantietoalue ja vaikutusalue),
          suunnittelun tavoitteet, vaikutukset ja toimenpiteet pääpiirteittäin karkealla tasolla. Älä lisää tekstiin
          linkkejä.
        </p>
      </SectionContent>
      <SectionContent>
        <Textarea
          label={`Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä (${lowerCase(ensisijainenKieli)}) *`}
          {...register(`nahtavillaoloVaihe.hankkeenKuvaus.${ensisijainenKieli}`)}
          error={(errors.nahtavillaoloVaihe?.hankkeenKuvaus as any)?.[ensisijainenKieli]}
          maxLength={2000}
        />
      </SectionContent>
      {toissijainenKieli && (
        <SectionContent>
          <Textarea
            label={`Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (${lowerCase(toissijainenKieli)}) *`}
            {...register(`nahtavillaoloVaihe.hankkeenKuvaus.${toissijainenKieli}`)}
            error={(errors.nahtavillaoloVaihe?.hankkeenKuvaus as any)?.[toissijainenKieli]}
            maxLength={2000}
          />
        </SectionContent>
      )}
    </Section>
  );
}
