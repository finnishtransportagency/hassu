import Textarea from "@components/form/Textarea";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { Kielitiedot, LokalisoituTekstiInput } from "@services/api";
import React from "react";
import { useFormContext } from "react-hook-form";
import lowerCase from "lodash/lowerCase";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import Notification, { NotificationType } from "@components/notification/Notification";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";

type Props = {
  kielitiedot: Kielitiedot | null | undefined;
  projekti: ProjektiLisatiedolla;
};

type FormFields = {
  nahtavillaoloVaihe: {
    hankkeenKuvaus: LokalisoituTekstiInput;
  };
};

export default function KuulutusJaJulkaisuPaiva({ kielitiedot, projekti }: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormFields>();

  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  return (
    <Section>
      <SectionContent>
        <h4 className="vayla-small-title">Hankkeen sisällönkuvaus</h4>
        <p>
          Kirjoita tiivistetty sisällönkuvaus hankkeesta. Kuvauksen on hyvä sisältää esimerkiksi tieto suunnittelukohteen alueellisesta
          rajauksesta (maantie- /rautatiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja toimenpiteet pääpiirteittäin
          karkealla tasolla. Älä lisää tekstiin linkkejä.
        </p>
        {!projekti.nahtavillaoloVaihe?.hankkeenKuvaus && (
          <Notification type={NotificationType.INFO_GRAY}>
            Tiivistetty hankkeen sisällönkuvaus on noudettu aikaisemmasta vaiheesta. Voit muokata esitäytettyä kuvausta.
          </Notification>
        )}
      </SectionContent>
      {ensisijainenKaannettavaKieli && (
        <SectionContent>
          <Textarea
            label={`Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä (${lowerCase(ensisijainenKaannettavaKieli)}) *`}
            {...register(`nahtavillaoloVaihe.hankkeenKuvaus.${ensisijainenKaannettavaKieli}`)}
            error={(errors.nahtavillaoloVaihe?.hankkeenKuvaus as any)?.[ensisijainenKaannettavaKieli]}
            maxLength={2000}
          />
        </SectionContent>
      )}

      {toissijainenKaannettavaKieli && (
        <SectionContent>
          <Textarea
            label={`Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (${lowerCase(toissijainenKaannettavaKieli)}) *`}
            {...register(`nahtavillaoloVaihe.hankkeenKuvaus.${toissijainenKaannettavaKieli}`)}
            error={(errors.nahtavillaoloVaihe?.hankkeenKuvaus as any)?.[toissijainenKaannettavaKieli]}
            maxLength={2000}
          />
        </SectionContent>
      )}
    </Section>
  );
}
