import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import { HyvaksymisPaatosVaiheTila, KayttajaTyyppi, Projekti, ProjektiKayttaja, YhteystietoInput } from "@services/api";
import Section from "@components/layout/Section";
import { Fragment, ReactElement } from "react";
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
import { KuulutuksenTiedotFormValues } from "./index";

const defaultYhteystieto: YhteystietoInput = {
  etunimi: "",
  sukunimi: "",
  organisaatio: "",
  puhelinnumero: "",
  sahkoposti: "",
};

interface Props {}

function hasHyvaksyttyHyvaksymisPaatosVaiheJulkaisu(projekti: Projekti | null | undefined) {
  return (
    (projekti?.hyvaksymisPaatosVaiheJulkaisut?.filter((julkaisu) => julkaisu.tila == HyvaksymisPaatosVaiheTila.HYVAKSYTTY) || []).length > 0
  );
}

export default function EsitettavatYhteystiedot({}: Props): ReactElement {
  const { data: projekti } = useProjekti();

  const eiVoiMuokata = hasHyvaksyttyHyvaksymisPaatosVaiheJulkaisu(projekti);

  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<KuulutuksenTiedotFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "hyvaksymisPaatosVaihe.kuulutusYhteystiedot.yhteysTiedot",
  });

  const kuulutusYhteysHenkilot: ProjektiKayttaja[] = projekti?.hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.yhteysHenkilot
    ? projekti.hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.yhteysHenkilot
        .map((hlo) => {
          const yhteysHenkiloTietoineen: ProjektiKayttaja | undefined = (projekti?.kayttoOikeudet || []).find(
            (ko) => ko.kayttajatunnus === hlo
          );
          if (!yhteysHenkiloTietoineen) {
            return {} as ProjektiKayttaja;
          }
          return yhteysHenkiloTietoineen as ProjektiKayttaja;
        })
        .filter((pk) => pk.etunimi && pk.sukunimi)
    : ([] as ProjektiKayttaja[]);

  if (eiVoiMuokata) {
    return (
      <Section>
        <SectionContent>
          <p className="vayla-label mb-5">Vuorovaikuttamisen yhteyshenkilöt</p>
          {projekti?.hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.yhteysTiedot?.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {capitalize(yhteystieto.etunimi)} {capitalize(yhteystieto.sukunimi)}, puh. {yhteystieto.puhelinnumero},{" "}
              {yhteystieto?.sahkoposti ? replace(yhteystieto?.sahkoposti, "@", "[at]") : ""} ({yhteystieto.organisaatio})
            </p>
          ))}
          {kuulutusYhteysHenkilot.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {yhteystieto.sukunimi} {yhteystieto.etunimi}, puh. {yhteystieto.puhelinnumero},{" "}
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
        <h4 className="vayla-small-title">Kuulutuksessa esitettävät yhteystiedot</h4>
        <p>
          Voit valita kutsussa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden yhteystiedon. Projektipäällikön
          tiedot esitetään aina. Projektiin tallennettujen henkilöiden yhteystiedot haetaan Projektin henkilöt -sivulle tallennetuista
          tiedoista.
        </p>
        {projekti?.kayttoOikeudet && projekti.kayttoOikeudet.length > 0 ? (
          <Controller
            control={control}
            name={`hyvaksymisPaatosVaihe.kuulutusYhteystiedot.yhteysHenkilot`}
            render={({ field: { onChange, value, ...field } }) => (
              <FormGroup label="Projektiin tallennetut henkilöt" inlineFlex>
                {projekti.kayttoOikeudet?.map(({ etunimi, sukunimi, tyyppi, kayttajatunnus }, index) => {
                  const tunnuslista: string[] = value || [];
                  const nimi = sukunimi + " " + etunimi;
                  return (
                    <Fragment key={index}>
                      {tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO ? (
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
              </FormGroup>
            )}
          />
        ) : (
          <p>Projektilla ei ole tallennettuja henkilöitä</p>
        )}
      </SectionContent>
      <SectionContent>
        <p>Uusi yhteystieto</p>
        <p>
          Lisää uudelle yhteystiedolle rivi Lisää uusi-painikkeella. Huomioi, että uusi yhteystieto ei tallennu Projektin henkilöt -sivulle
          eikä henkilölle tule käyttöoikeuksia projektiin.
        </p>
      </SectionContent>
      {fields.map((field, index) => (
        <HassuStack key={field.id} direction={["column", "column", "row"]}>
          <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 3]}>
            <TextInput
              label="Etunimi *"
              {...register(`hyvaksymisPaatosVaihe.kuulutusYhteystiedot.yhteysTiedot.${index}.etunimi`)}
              error={(errors as any).hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.[index]?.etunimi}
            />
            <TextInput
              label="Sukunimi *"
              {...register(`hyvaksymisPaatosVaihe.kuulutusYhteystiedot.yhteysTiedot.${index}.sukunimi`)}
              error={(errors as any).hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.[index]?.sukunimi}
            />
            <TextInput
              label="Organisaatio / kunta *"
              {...register(`hyvaksymisPaatosVaihe.kuulutusYhteystiedot.yhteysTiedot.${index}.organisaatio`)}
              error={(errors as any).hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.[index]?.organisaatio}
            />
            <TextInput
              label="Puhelinnumero *"
              {...register(`hyvaksymisPaatosVaihe.kuulutusYhteystiedot.yhteysTiedot.${index}.puhelinnumero`)}
              error={(errors as any).hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.[index]?.puhelinnumero}
              maxLength={maxPhoneLength}
            />
            <TextInput
              label="Sähköpostiosoite *"
              {...register(`hyvaksymisPaatosVaihe.kuulutusYhteystiedot.yhteysTiedot.${index}.sahkoposti`)}
              error={(errors as any).hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.[index]?.sahkoposti}
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
        onClick={(event) => {
          event.preventDefault();
          append(defaultYhteystieto);
        }}
      >
        Lisää uusi +
      </Button>
    </Section>
  );
}
