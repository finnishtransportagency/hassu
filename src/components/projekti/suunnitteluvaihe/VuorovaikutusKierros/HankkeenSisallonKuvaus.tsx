import { useFormContext } from "react-hook-form";
import { ReactElement } from "react";
import { maxHankkeenkuvausLength } from "src/schemas/vuorovaikutus";
import { VuorovaikutusFormValues } from ".";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import Notification, { NotificationType } from "@components/notification/Notification";
import Textarea from "@components/form/Textarea";
import { Kieli, Kielitiedot } from "@services/api";
import { getKaannettavatKielet } from "hassu-common/kaannettavatKielet";
import { label } from "src/util/textUtil";

type Props = {
  kielitiedot: Kielitiedot | null | undefined;
};

export default function HankkeenSisallonKuvaus({ kielitiedot }: Props): ReactElement {
  const {
    register,
    formState: { errors },
  } = useFormContext<VuorovaikutusFormValues>();

  if (!kielitiedot) return <></>;
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  return (
    <Section>
      <SectionContent largeGaps>
        <h2 className="vayla-title">Hankkeen sisällönkuvaus</h2>
        <p>
          Kirjoita tiivistetty sisällönkuvaus hankkeesta. Kuvauksen on hyvä sisältää esimerkiksi tieto suunnittelukohteen alueellisesta
          rajauksesta (maantie- /rautatiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja toimenpiteet pääpiirteittäin
          karkealla tasolla. Älä lisää tekstiin linkkejä.
        </p>
      </SectionContent>

      <Notification type={NotificationType.INFO_GRAY}>
        Tiivistetty hankkeen sisällönkuvaus on noudettu aloituskuulutusvaiheesta. Voit muokata kuvausta. Muutokset päivittyvät palvelun
        julkiselle puolella Tallenna ja julkaise -painikkeen painamisen jälkeen.
      </Notification>
      {ensisijainenKaannettavaKieli && (
        <Textarea
          label={label({
            label: "Tiivistetty hankeen sisällönkuvaus",
            inputLanguage: ensisijainenKaannettavaKieli,
            kielitiedot,
            required: true,
          })}
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
          label={label({
            label: "Tiivistetty hankeen sisällönkuvaus",
            inputLanguage: toissijainenKaannettavaKieli,
            kielitiedot,
            required: true,
          })}
          {...register(`vuorovaikutusKierros.hankkeenKuvaus.${toissijainenKaannettavaKieli}`)}
          error={(errors.vuorovaikutusKierros?.hankkeenKuvaus as any)?.[toissijainenKaannettavaKieli]}
          maxLength={maxHankkeenkuvausLength}
        />
      )}
    </Section>
  );
}
