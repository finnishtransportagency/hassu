import { FormProvider, useForm, useFormContext, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { suunnittelunPerustiedotSchema, maxAloituskuulutusLength } from "src/schemas/suunnittelunPerustiedot";
import SectionContent from "@components/layout/SectionContent";
import Textarea from "@components/form/Textarea";
import { Kieli, Projekti, SuunnitteluVaiheInput, TallennaProjektiInput } from "@services/api";
import Section from "@components/layout/Section";
import lowerCase from "lodash/lowerCase";
import { ReactElement, useEffect } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import TextInput from "@components/form/TextInput";

type ProjektiFields = Pick<TallennaProjektiInput, "oid" | "kayttoOikeudet">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
  suunnitteluVaihe: Pick<SuunnitteluVaiheInput, "hankkeenKuvaus" | "arvioSeuraavanVaiheenAlkamisesta">;
};

interface Props {
  projekti?: Projekti | null;
}

export default function SuunniteluvaiheenPerustiedot({ projekti }: Props): ReactElement {
  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(suunnittelunPerustiedotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      suunnitteluVaihe: {
        hankkeenKuvaus: {
          SUOMI: projekti?.aloitusKuulutus?.hankkeenKuvaus?.SUOMI,
          RUOTSI: projekti?.aloitusKuulutus?.hankkeenKuvaus?.RUOTSI,
          SAAME: projekti?.aloitusKuulutus?.hankkeenKuvaus?.SAAME,
        },
        arvioSeuraavanVaiheenAlkamisesta: "1.1.2023",
      },
    },
  };

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    register,
    reset,
    formState: { errors },
  } = useFormReturn;

  useEffect(() => {
    //   reset()
  }, [projekti, reset]);

  if (!projekti) {
    return <></>;
  }

  const kielitiedot = projekti.kielitiedot;
  const ensisijainenKieli = projekti.kielitiedot ? projekti.kielitiedot.ensisijainenKieli : Kieli.SUOMI;
  const toissijainenKieli = kielitiedot?.toissijainenKieli;

  return (
    <>
      <FormProvider {...useFormReturn}>
        <form>
          <Section>
            <SectionContent largeGaps>
              <h5 className="vayla-small-title">Hankkeen sisällönkuvaus</h5>
              <p>
                Kirjoita kenttään tiivistetty sisällönkuvaus hankkeesta. Kuvauksen on hyvä sisältää esimerkiksi tieto
                suunnittelukohteen alueellista rajauksesta (maantiealue ja vaikutusalue), suunnittelun tavoitteet,
                vaikutukset ja toimenpiteet pääpiirteittäin karkealla tasolla. Älä lisää tekstiin linkkejä.
              </p>
            </SectionContent>
            <Notification type={NotificationType.INFO_GRAY}>
              Tiivistetty hankkeen sisälönkuvaus on noudettu aloituskuulutuvaiheesta. Voit muokata kuvausta. Muutokset
              päivittyvät palvelun julkiselle puolella Tallenna ja julkaise -painikkeen painamisen jälkeen.
            </Notification>

            <Textarea
              label={`Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä (${lowerCase(
                kielitiedot?.ensisijainenKieli
              )}) *`}
              {...register(`suunnitteluVaihe.hankkeenKuvaus.${ensisijainenKieli}`)}
              error={
                (errors.suunnitteluVaihe?.hankkeenKuvaus as any)?.[
                  kielitiedot?.ensisijainenKieli ? kielitiedot.ensisijainenKieli : Kieli.SUOMI
                ]
              }
              maxLength={maxAloituskuulutusLength}
            />
            {toissijainenKieli && (
              <Textarea
                label={`Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (${lowerCase(
                  toissijainenKieli
                )}) *`}
                {...register(`suunnitteluVaihe.hankkeenKuvaus.${toissijainenKieli}`)}
                error={(errors.suunnitteluVaihe?.hankkeenKuvaus as any)?.[toissijainenKieli]}
                maxLength={maxAloituskuulutusLength}
              />
            )}
          </Section>

          <Section>
            <h5 className="vayla-small-title">Suunnittelun eteneminen ja arvio kestosta</h5>
            <SectionContent>
              <p>
                Kuvaa kansalaiselle suunnittelun etenemistä ja sen tilaa. Voit käyttää alla olevaan kenttään tuotua
                vakiotekstiä tai kertoa omin sanoin.{" "}
              </p>
              <Textarea
                label="Julkisella puolella esitettävä suunnittelun etenemisen kuvaus"
                {...register("suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta")}
                error={errors.suunnitteluVaihe?.arvioSeuraavanVaiheenAlkamisesta}
                maxLength={maxAloituskuulutusLength}
              />
              <p>
                Anna arvio hallinnollisen käsittelyn seuraavan vaiheen alkamisesta. Seuraava vaihe on nähtävillä olo,
                jossa kansalaisilla on mahdollisuus jättää muistutuksia tehtyihin suunnitelmiin.
              </p>

              <p>
                {`Arvio esitetään palvelun julkisella puolella. Jos arviota ei pystytä antamaan, kirjoita 'Seuraavan
                vaiheen alkamisesta ei pystytä vielä antamaan arviota'`}
                .
              </p>
              <TextInput label={"Arvio seuraavan vaiheen alkamisesta *"} maxLength={150}></TextInput>
            </SectionContent>
          </Section>
          <Section>
            <h5 className="vayla-small-title">Saapuneet kysymykset ja palautteet</h5>
            <SectionContent>
              <p>Ei saapuneita kysymyksiä tai palautteita</p>
            </SectionContent>
          </Section>
        </form>
      </FormProvider>
    </>
  );
}
