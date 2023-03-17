import { useFormContext } from "react-hook-form";
import { ReactElement } from "react";
import { maxHankkeenkuvausLength } from "src/schemas/vuorovaikutus";
import { VuorovaikutusFormValues } from ".";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import Notification, { NotificationType } from "@components/notification/Notification";
import Textarea from "@components/form/Textarea";
import lowerCase from "lodash/lowerCase";
import { Kieli, Kielitiedot } from "@services/api";
import { getKaannettavatKielet } from "common/kaannettavatKielet";

type Props = {
  kielitiedot: Kielitiedot | null | undefined;
};

export default function HankkeenSisallonKuvaus({ kielitiedot }: Props): ReactElement {
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  const {
    register,
    formState: { errors },
  } = useFormContext<VuorovaikutusFormValues>();

  return (
    <Section>
      <SectionContent largeGaps>
        <h5 className="vayla-small-title">Hankkeen sisällönkuvaus</h5>
        <p>
          Kirjoita kenttään tiivistetty sisällönkuvaus hankkeesta. Kuvauksen on hyvä sisältää esimerkiksi tieto suunnittelukohteen
          alueellista rajauksesta (maantiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja toimenpiteet pääpiirteittäin
          karkealla tasolla. Älä lisää tekstiin linkkejä.
        </p>
      </SectionContent>

      <Notification type={NotificationType.INFO_GRAY}>
        Tiivistetty hankkeen sisällönkuvaus on noudettu aloituskuulutusvaiheesta. Voit muokata kuvausta. Muutokset tulevat näkyviin palvelun
        julkiselle puolella Tallenna ja julkaise -painikkeen painamisen jälkeen.
      </Notification>
      {ensisijainenKaannettavaKieli && (
        <Textarea
          label={`Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä (${lowerCase(ensisijainenKaannettavaKieli)}) *`}
          {...register(`vuorovaikutusKierros.hankkeenKuvaus.${ensisijainenKaannettavaKieli}`)}
          error={
            (errors.vuorovaikutusKierros?.hankkeenKuvaus as any)?.[
              ensisijainenKaannettavaKieli ? ensisijainenKaannettavaKieli : Kieli.SUOMI
            ]
          }
          maxLength={maxHankkeenkuvausLength}
        />
      )}
      {toissijainenKaannettavaKieli && (
        <Textarea
          label={`Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (${lowerCase(toissijainenKaannettavaKieli)}) *`}
          {...register(`vuorovaikutusKierros.hankkeenKuvaus.${toissijainenKaannettavaKieli}`)}
          error={(errors.vuorovaikutusKierros?.hankkeenKuvaus as any)?.[toissijainenKaannettavaKieli]}
          maxLength={maxHankkeenkuvausLength}
        />
      )}
    </Section>
  );
}
