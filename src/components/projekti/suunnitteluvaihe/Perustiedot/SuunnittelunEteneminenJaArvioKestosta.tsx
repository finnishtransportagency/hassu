import { useFormContext } from "react-hook-form";
import { ReactElement } from "react";
import { maxHankkeenkuvausLength } from "src/schemas/vuorovaikutus";
import { SuunnittelunPerustiedotFormValues } from ".";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import Textarea from "@components/form/Textarea";
import TextInput from "@components/form/TextInput";
import { Kieli, Kielitiedot } from "@services/api";
import lowerCase from "lodash/lowerCase";

type Props = {
  kielitiedot: Kielitiedot | null | undefined;
};

export default function SuunnittelunEteneminenJaArvioKestosta({ kielitiedot }: Props): ReactElement {
  const {
    register,
    formState: { errors },
    trigger,
    setValue,
  } = useFormContext<SuunnittelunPerustiedotFormValues>();

  const ensisijainenKieli = kielitiedot?.ensisijainenKieli || Kieli.SUOMI;
  const toissijainenKieli = kielitiedot?.toissijainenKieli;

  return (
    <Section noDivider>
      <h5 className="vayla-small-title">Suunnittelun eteneminen ja arvio kestosta</h5>
      <SectionContent className="pb-8">
        <p>
          Kuvaa kansalaiselle suunnittelun etenemistä ja sen tilaa. Voit käyttää alla olevaan kenttään tuotua vakiotekstiä tai kertoa omin
          sanoin.{" "}
        </p>
        <Textarea
          label={`Julkisella puolella esitettävä suunnittelun etenemisen kuvaus ensisijaisella kielellä (${lowerCase(ensisijainenKieli)})`}
          maxLength={maxHankkeenkuvausLength}
          {...register(`vuorovaikutusKierros.suunnittelunEteneminenJaKesto.${ensisijainenKieli}`)}
          onChange={(e) => {
            setValue(`vuorovaikutusKierros.suunnittelunEteneminenJaKesto.${ensisijainenKieli}`, e.target.value);
            if (toissijainenKieli) {
              trigger(`vuorovaikutusKierros.suunnittelunEteneminenJaKesto.${toissijainenKieli}`);
            }
          }}
          error={(errors.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto as any)?.[ensisijainenKieli]}
        />
        {toissijainenKieli && (
          <Textarea
            label={`Julkisella puolella esitettävä suunnittelun etenemisen kuvaus toissijaisella kielellä (${lowerCase(
              toissijainenKieli
            )})`}
            maxLength={maxHankkeenkuvausLength}
            {...register(`vuorovaikutusKierros.suunnittelunEteneminenJaKesto.${toissijainenKieli}`)}
            onChange={(e) => {
              setValue(`vuorovaikutusKierros.suunnittelunEteneminenJaKesto.${toissijainenKieli}`, e.target.value);
              if (toissijainenKieli) {
                trigger(`vuorovaikutusKierros.suunnittelunEteneminenJaKesto.${ensisijainenKieli}`);
              }
            }}
            error={(errors.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto as any)?.[toissijainenKieli]}
          />
        )}
      </SectionContent>
      <SectionContent>
        <p>
          Anna arvio hallinnollisen käsittelyn seuraavan vaiheen alkamisesta. Seuraava vaihe on nähtävillä olo, jossa kansalaisilla on
          mahdollisuus jättää muistutuksia tehtyihin suunnitelmiin.
        </p>

        <p className="mb-8 pb-6">
          {`Arvio esitetään palvelun julkisella puolella. Jos arviota ei pystytä antamaan, kirjoita 'Seuraavan
        vaiheen alkamisesta ei pystytä vielä antamaan arviota'`}
          .
        </p>
        <TextInput
          className="mt-8"
          label={`Arvio seuraavan vaiheen alkamisesta ensisijaisella kielellä (${lowerCase(ensisijainenKieli)})`}
          maxLength={maxHankkeenkuvausLength}
          {...register(`vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.${ensisijainenKieli}`)}
          onChange={(e) => {
            setValue(`vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.${ensisijainenKieli}`, e.target.value);
            if (toissijainenKieli) {
              trigger(`vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.${toissijainenKieli}`);
            }
          }}
          error={(errors.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta as any)?.[ensisijainenKieli]}
        />
        {toissijainenKieli && (
          <TextInput
            label={`Arvio seuraavan vaiheen alkamisesta toissijaisella kielellä (${lowerCase(toissijainenKieli)})`}
            maxLength={maxHankkeenkuvausLength}
            {...register(`vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.${toissijainenKieli}`)}
            onChange={(e) => {
              setValue(`vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.${toissijainenKieli}`, e.target.value);
              trigger(`vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.${ensisijainenKieli}`);
            }}
            error={(errors.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta as any)?.[toissijainenKieli]}
          />
        )}
      </SectionContent>
    </Section>
  );
}
