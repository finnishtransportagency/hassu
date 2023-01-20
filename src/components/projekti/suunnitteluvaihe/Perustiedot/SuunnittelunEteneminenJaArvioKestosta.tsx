import { useFormContext } from "react-hook-form";
import { ReactElement } from "react";
import { maxHankkeenkuvausLength } from "src/schemas/vuorovaikutus";
import { SuunnittelunPerustiedotFormValues } from ".";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import Textarea from "@components/form/Textarea";
import TextInput from "@components/form/TextInput";

export default function SuunnittelunEteneminenJaArvioKestosta(): ReactElement {
  const {
    register,
    formState: { errors },
  } = useFormContext<SuunnittelunPerustiedotFormValues>();

  return (
    <Section noDivider>
      <h5 className="vayla-small-title">Suunnittelun eteneminen ja arvio kestosta</h5>
      <SectionContent>
        <p>
          Kuvaa kansalaiselle suunnittelun etenemistä ja sen tilaa. Voit käyttää alla olevaan kenttään tuotua vakiotekstiä tai kertoa omin
          sanoin.{" "}
        </p>
        <Textarea
          label="Julkisella puolella esitettävä suunnittelun etenemisen kuvaus"
          maxLength={maxHankkeenkuvausLength}
          {...register("vuorovaikutusKierros.suunnittelunEteneminenJaKesto")}
          error={errors.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto}
        />
        <p>
          Anna arvio hallinnollisen käsittelyn seuraavan vaiheen alkamisesta. Seuraava vaihe on nähtävillä olo, jossa kansalaisilla on
          mahdollisuus jättää muistutuksia tehtyihin suunnitelmiin.
        </p>

        <p>
          {`Arvio esitetään palvelun julkisella puolella. Jos arviota ei pystytä antamaan, kirjoita 'Seuraavan
        vaiheen alkamisesta ei pystytä vielä antamaan arviota'`}
          .
        </p>
        <TextInput
          label={"Arvio seuraavan vaiheen alkamisesta"}
          maxLength={150}
          {...register("vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta")}
          error={errors.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta}
        ></TextInput>
      </SectionContent>
    </Section>
  );
}
