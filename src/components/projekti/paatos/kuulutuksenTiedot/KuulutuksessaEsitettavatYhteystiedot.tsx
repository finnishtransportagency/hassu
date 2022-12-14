import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import {
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  KuulutusJulkaisuTila,
  KayttajaTyyppi,
  ProjektiKayttaja,
  Yhteystieto,
  YhteystietoInput,
} from "@services/api";
import Section from "@components/layout/Section";
import { Fragment, ReactElement, useMemo } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import CheckBox from "@components/form/CheckBox";
import FormGroup from "@components/form/FormGroup";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import { maxPhoneLength } from "src/schemas/puhelinNumero";
import IconButton from "@components/button/IconButton";
import replace from "lodash/replace";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { KuulutuksenTiedotFormValues } from "./index";
import { formatNimi } from "../../../../util/userUtil";
import { PaatosTyyppi } from "src/util/getPaatosSpecificData";
import projektiKayttajaToYhteystieto, { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";

const defaultYhteystieto: YhteystietoInput = {
  etunimi: "",
  sukunimi: "",
  organisaatio: "",
  puhelinnumero: "",
  sahkoposti: "",
};

interface Props {
  paatosTyyppi: PaatosTyyppi;
  julkaisut: HyvaksymisPaatosVaiheJulkaisu[] | null | undefined;
  projekti: ProjektiLisatiedolla;
  julkaisematonPaatos: HyvaksymisPaatosVaihe | null | undefined;
}

function hasHyvaksyttyPaatosVaiheJulkaisu(julkaisut: HyvaksymisPaatosVaiheJulkaisu[] | null | undefined) {
  return (julkaisut?.filter((julkaisu) => julkaisu.tila == KuulutusJulkaisuTila.HYVAKSYTTY) || []).length > 0;
}

export default function EsitettavatYhteystiedot({ julkaisut, projekti, julkaisematonPaatos }: Props): ReactElement {
  const eiVoiMuokata = hasHyvaksyttyPaatosVaiheJulkaisu(julkaisut);

  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<KuulutuksenTiedotFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "paatos.kuulutusYhteystiedot.yhteysTiedot",
  });

  const kuulutusYhteysHenkilot: ProjektiKayttaja[] = julkaisematonPaatos?.kuulutusYhteystiedot?.yhteysHenkilot
    ? julkaisematonPaatos?.kuulutusYhteystiedot?.yhteysHenkilot
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

  const projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[] = useMemo(() => {
    const kunnanEdustaja = projekti?.kayttoOikeudet?.find((hlo) => hlo.kayttajatunnus === projekti.suunnitteluSopimus?.yhteysHenkilo);
    const projari = projekti?.kayttoOikeudet?.find((hlo) => hlo.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO);
    const arr: ProjektiKayttaja[] = [];
    if (kunnanEdustaja) {
      arr.push(kunnanEdustaja);
      projekti?.kayttoOikeudet?.forEach((hlo) => {
        if (hlo.kayttajatunnus !== projekti.suunnitteluSopimus?.yhteysHenkilo) {
          arr.push(hlo);
        }
      });
    } else {
      arr.push(projari as ProjektiKayttaja);
      projekti?.kayttoOikeudet?.forEach((hlo) => {
        if (hlo.tyyppi !== KayttajaTyyppi.PROJEKTIPAALLIKKO) {
          arr.push(hlo);
        }
      });
    }
    return arr.map((hlo) => ({ kayttajatunnus: hlo.kayttajatunnus, ...projektiKayttajaToYhteystieto(hlo, projekti?.suunnitteluSopimus) }));
  }, [projekti]);

  if (eiVoiMuokata) {
    return (
      <Section>
        <SectionContent>
          <p className="vayla-label mb-5">Vuorovaikuttamisen yhteyshenkilöt</p>
          {julkaisematonPaatos?.kuulutusYhteystiedot?.yhteysTiedot?.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {formatNimi(yhteystieto)}, puh. {yhteystieto.puhelinnumero},{" "}
              {yhteystieto?.sahkoposti ? replace(yhteystieto?.sahkoposti, "@", "[at]") : ""} ({yhteystieto.organisaatio})
            </p>
          ))}
          {kuulutusYhteysHenkilot.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {formatNimi(yhteystieto)}, puh. {yhteystieto.puhelinnumero},{" "}
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
        {projektiHenkilot.length > 0 ? (
          <Controller
            control={control}
            name={`paatos.kuulutusYhteystiedot.yhteysHenkilot`}
            render={({ field: { onChange, value, ...field } }) => (
              <FormGroup label="Projektiin tallennetut henkilöt" inlineFlex>
                {projektiHenkilot.map((hlo, index) => {
                  const tunnuslista: string[] = value || [];
                  return (
                    <Fragment key={index}>
                      {index === 0 ? (
                        <CheckBox label={yhteystietoVirkamiehelleTekstiksi(hlo)} disabled checked {...field} />
                      ) : (
                        <CheckBox
                          label={yhteystietoVirkamiehelleTekstiksi(hlo)}
                          onChange={(event) => {
                            if (!event.target.checked) {
                              onChange(tunnuslista.filter((tunnus) => tunnus !== hlo.kayttajatunnus));
                            } else {
                              onChange([...tunnuslista, hlo.kayttajatunnus]);
                            }
                          }}
                          checked={tunnuslista.includes(hlo.kayttajatunnus)}
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
              {...register(`paatos.kuulutusYhteystiedot.yhteysTiedot.${index}.etunimi`)}
              error={(errors as any).hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.[index]?.etunimi}
            />
            <TextInput
              label="Sukunimi *"
              {...register(`paatos.kuulutusYhteystiedot.yhteysTiedot.${index}.sukunimi`)}
              error={(errors as any).hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.[index]?.sukunimi}
            />
            <TextInput
              label="Organisaatio / kunta *"
              {...register(`paatos.kuulutusYhteystiedot.yhteysTiedot.${index}.organisaatio`)}
              error={(errors as any).hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.[index]?.organisaatio}
            />
            <TextInput
              label="Puhelinnumero *"
              {...register(`paatos.kuulutusYhteystiedot.yhteysTiedot.${index}.puhelinnumero`)}
              error={(errors as any).hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.[index]?.puhelinnumero}
              maxLength={maxPhoneLength}
            />
            <TextInput
              label="Sähköpostiosoite *"
              {...register(`paatos.kuulutusYhteystiedot.yhteysTiedot.${index}.sahkoposti`)}
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
