import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import { ProjektiRooli, YhteystietoInput, ProjektiKayttaja } from "@services/api";
import Section from "@components/layout/Section";
import { ReactElement, useMemo, Fragment } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import CheckBox from "@components/form/CheckBox";
import FormGroup from "@components/form/FormGroup";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import { maxPhoneLength } from "src/schemas/puhelinNumero";
import IconButton from "@components/button/IconButton";
import capitalize from "lodash/capitalize";
import replace from "lodash/replace";
import { useProjekti } from "src/hooks/useProjekti";
import { VuorovaikutusFormValues } from "./SuunnitteluvaiheenVuorovaikuttaminen";

const defaultYhteystieto: YhteystietoInput = {
  etunimi: "",
  sukunimi: "",
  organisaatio: "",
  puhelinnumero: "",
  sahkoposti: "",
};

interface Props {
  vuorovaikutusnro: number;
}

export default function EsitettavatYhteystiedot({ vuorovaikutusnro }: Props): ReactElement {
  const { data: projekti } = useProjekti();

  const v = useMemo(() => {
    return projekti?.suunnitteluVaihe?.vuorovaikutukset?.find((v) => {
      return v.vuorovaikutusNumero === vuorovaikutusnro;
    });
  }, [projekti, vuorovaikutusnro]);

  const julkinen = v?.julkinen;

  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<VuorovaikutusFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot",
  });

  const vuorovaikutusYhteysHenkilot: ProjektiKayttaja[] = v?.vuorovaikutusYhteysHenkilot
    ? v?.vuorovaikutusYhteysHenkilot
        .map((hlo) => {
          const yhteysHenkiloTietoineen: ProjektiKayttaja | undefined = (projekti?.kayttoOikeudet || []).find(
            (ko) => ko.kayttajatunnus === hlo
          );
          if (!yhteysHenkiloTietoineen) {
            return {} as ProjektiKayttaja;
          }
          return yhteysHenkiloTietoineen as ProjektiKayttaja;
        })
        .filter((pk) => pk.nimi)
    : [];

  if (julkinen) {
    return (
      <Section>
        <SectionContent>
          <p className="vayla-label mb-5">Vuorovaikuttamisen yhteyshenkil??t</p>
          {v?.esitettavatYhteystiedot?.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {capitalize(yhteystieto.etunimi)} {capitalize(yhteystieto.sukunimi)}, puh. {yhteystieto.puhelinnumero},{" "}
              {yhteystieto?.sahkoposti ? replace(yhteystieto?.sahkoposti, "@", "[at]") : ""} ({yhteystieto.organisaatio}
              )
            </p>
          ))}
          {vuorovaikutusYhteysHenkilot.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {yhteystieto.nimi}, puh. {yhteystieto.puhelinnumero},{" "}
              {yhteystieto.email ? replace(yhteystieto.email, "@", "[at]") : ""} ({yhteystieto.organisaatio})
            </p>
          ))}
        </SectionContent>
      </Section>
    );
  }

  return (
    <Section>
      <SectionContent>
        <h4 className="vayla-small-title">Vuorovaikuttamisen yhteyshenkil??t</h4>
        <p>
          Voit valita kutsussa esitett??viin yhteystietoihin projektiin tallennetun henkil??n tai lis??t?? uuden
          yhteystiedon. Projektip????llik??n tiedot esitet????n aina. Projektiin tallennettujen henkil??iden yhteystiedot
          haetaan Projektin henkil??t -sivulle tallennetuista tiedoista.
        </p>
        {projekti?.kayttoOikeudet && projekti.kayttoOikeudet.length > 0 ? (
          <Controller
            control={control}
            name={`suunnitteluVaihe.vuorovaikutus.vuorovaikutusYhteysHenkilot`}
            render={({ field: { onChange, value, ...field } }) => (
              <FormGroup label="Projektiin tallennetut henkil??t" inlineFlex>
                {projekti.kayttoOikeudet?.map(({ nimi, rooli, kayttajatunnus }, index) => {
                  const tunnuslista = value || [];
                  return (
                    <Fragment key={index}>
                      {rooli === ProjektiRooli.PROJEKTIPAALLIKKO ? (
                        <CheckBox label={nimi} disabled checked {...field} />
                      ) : (
                        <CheckBox
                          label={nimi}
                          onChange={(event) => {
                            if (!event.target.checked) {
                              onChange(tunnuslista.filter((tunnus) => tunnus !== kayttajatunnus));
                            } else {
                              onChange([...tunnuslista, kayttajatunnus]);
                            }
                          }}
                          checked={tunnuslista.includes(kayttajatunnus)}
                          {...field}
                        />
                      )}
                    </Fragment>
                  );
                })}
                {projekti?.suunnitteluSopimus && (
                  <CheckBox
                    label={`${projekti.suunnitteluSopimus.sukunimi}, ${projekti.suunnitteluSopimus.etunimi}`}
                    disabled
                    defaultChecked
                  />
                )}
              </FormGroup>
            )}
          />
        ) : (
          <p>Projektilla ei ole tallennettuja henkil??it??</p>
        )}
      </SectionContent>
      <SectionContent>
        <p>Uusi yhteystieto</p>
        <p>
          Lis???? uudelle yhteystiedolle rivi Lis???? uusi-painikkeella. Huomioi, ett?? uusi yhteystieto ei tallennu
          Projektin henkil??t -sivulle eik?? henkil??lle tule k??ytt??oikeuksia projektiin.
        </p>
      </SectionContent>
      {fields.map((field, index) => (
        <HassuStack key={field.id} direction={["column", "column", "row"]}>
          <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 3]}>
            <TextInput
              label="Etunimi *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.${index}.etunimi`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.etunimi}
            />
            <TextInput
              label="Sukunimi *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.${index}.sukunimi`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.sukunimi}
            />
            <TextInput
              label="Organisaatio / kunta *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.${index}.organisaatio`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.organisaatio}
            />
            <TextInput
              label="Puhelinnumero *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.${index}.puhelinnumero`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.puhelinnumero}
              maxLength={maxPhoneLength}
            />
            <TextInput
              label="S??hk??postiosoite *"
              {...register(`suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.${index}.sahkoposti`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.sahkoposti}
            />
          </HassuGrid>
          <div>
            <div className="hidden lg:block lg:mt-8">
              <IconButton
                icon="trash"
                onClick={(event) => {
                  event.preventDefault();
                  remove(index);
                }}
              />
            </div>
            <div className="block lg:hidden">
              <Button
                onClick={(event) => {
                  event.preventDefault();
                  remove(index);
                }}
                endIcon="trash"
              >
                Poista
              </Button>
            </div>
          </div>
        </HassuStack>
      ))}
      <Button
        id="append_vuorovaikuttamisen_yhteystiedot_button"
        onClick={(event) => {
          event.preventDefault();
          append(defaultYhteystieto);
        }}
      >
        Lis???? uusi +
      </Button>
    </Section>
  );
}
