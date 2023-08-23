import { useFormContext } from "react-hook-form";
import { ReactElement } from "react";
import { maxHankkeenkuvausLength } from "src/schemas/vuorovaikutus";
import { SuunnittelunPerustiedotFormValues } from ".";
import Section from "@components/layout/Section2";
import ContentSpacer from "@components/layout/ContentSpacer";
import Textarea from "@components/form/Textarea";
import TextInput from "@components/form/TextInput";
import { Kielitiedot } from "@services/api";
import lowerCase from "lodash/lowerCase";
import { getKaannettavatKielet } from "common/kaannettavatKielet";

type Props = {
  kielitiedot: Kielitiedot | null | undefined;
};

export default function SuunnittelunEteneminenJaArvioKestosta({ kielitiedot }: Props): ReactElement {
  const {
    register,
    formState: { errors },
    trigger,
  } = useFormContext<SuunnittelunPerustiedotFormValues>();

  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  return (
    <Section>
      <h5 className="vayla-small-title">Suunnittelun eteneminen ja arvio kestosta</h5>
      <ContentSpacer>
        <p>
          Kuvaa kansalaiselle suunnittelun etenemistä ja sen tilaa. Voit käyttää alla olevaan kenttään tuotua vakiotekstiä tai kertoa omin
          sanoin.
        </p>
        {ensisijainenKaannettavaKieli && (
          <Textarea
            label={`Julkisella puolella esitettävä suunnittelun etenemisen kuvaus ensisijaisella kielellä (${lowerCase(
              ensisijainenKaannettavaKieli
            )})`}
            maxLength={maxHankkeenkuvausLength}
            {...register(`vuorovaikutusKierros.suunnittelunEteneminenJaKesto.${ensisijainenKaannettavaKieli}`, {
              onChange: () => {
                if (toissijainenKaannettavaKieli) {
                  trigger(`vuorovaikutusKierros.suunnittelunEteneminenJaKesto.${toissijainenKaannettavaKieli}`);
                }
              },
            })}
            error={(errors.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto as any)?.[ensisijainenKaannettavaKieli]}
          />
        )}

        {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
          <Textarea
            label={`Julkisella puolella esitettävä suunnittelun etenemisen kuvaus toissijaisella kielellä (${lowerCase(
              toissijainenKaannettavaKieli
            )})`}
            maxLength={maxHankkeenkuvausLength}
            {...register(`vuorovaikutusKierros.suunnittelunEteneminenJaKesto.${toissijainenKaannettavaKieli}`, {
              onChange: () => {
                trigger(`vuorovaikutusKierros.suunnittelunEteneminenJaKesto.${ensisijainenKaannettavaKieli}`);
              },
            })}
            error={(errors.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto as any)?.[toissijainenKaannettavaKieli]}
          />
        )}
      </ContentSpacer>
      <ContentSpacer>
        <p>
          Anna arvio hallinnollisen käsittelyn seuraavan vaiheen alkamisesta. Seuraava vaihe on nähtävillä olo, jonka aikana kansalaisilla
          on mahdollisuus jättää muistutuksia tehtyihin suunnitelmiin.
        </p>
        <p>
          Arvio esitetään palvelun julkisella puolella. Jos arviota ei pystytä antamaan, kirjoita ‘Seuraavan vaiheen alkamisesta ei pystytä
          vielä antamaan arviota’.
        </p>
        {ensisijainenKaannettavaKieli && (
          <TextInput
            className="mt-8"
            label={`Arvio seuraavan vaiheen alkamisesta ensisijaisella kielellä (${lowerCase(ensisijainenKaannettavaKieli)})`}
            maxLength={maxHankkeenkuvausLength}
            {...register(`vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.${ensisijainenKaannettavaKieli}`, {
              onChange: () => {
                if (toissijainenKaannettavaKieli) {
                  trigger(`vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.${toissijainenKaannettavaKieli}`);
                }
              },
            })}
            error={(errors.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta as any)?.[ensisijainenKaannettavaKieli]}
          />
        )}

        {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
          <TextInput
            label={`Arvio seuraavan vaiheen alkamisesta toissijaisella kielellä (${lowerCase(toissijainenKaannettavaKieli)})`}
            maxLength={maxHankkeenkuvausLength}
            {...register(`vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.${toissijainenKaannettavaKieli}`, {
              onChange: () => {
                trigger(`vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.${ensisijainenKaannettavaKieli}`);
              },
            })}
            error={(errors.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta as any)?.[toissijainenKaannettavaKieli]}
          />
        )}
      </ContentSpacer>
    </Section>
  );
}
