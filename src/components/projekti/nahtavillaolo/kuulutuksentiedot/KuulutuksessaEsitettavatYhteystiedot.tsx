import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import { KayttajaTyyppi, Projekti, YhteystietoInput } from "@services/api";
import Section from "@components/layout/Section";
import { Fragment, ReactElement } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import FormGroup from "@components/form/FormGroup";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import { maxPhoneLength } from "hassu-common/schema/puhelinNumero";
import IconButton from "@components/button/IconButton";
import { useProjekti } from "src/hooks/useProjekti";
import { KuulutuksenTiedotFormValues } from "./KuulutuksenTiedot";
import { formatNimi } from "../../../../util/userUtil";
import { Checkbox, FormControlLabel } from "@mui/material";

const defaultYhteystieto: YhteystietoInput = {
  etunimi: "",
  sukunimi: "",
  organisaatio: "",
  puhelinnumero: "",
  sahkoposti: "",
};

export default function EsitettavatYhteystiedot(): ReactElement {
  const { data: projekti } = useProjekti();

  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<KuulutuksenTiedotFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "nahtavillaoloVaihe.kuulutusYhteystiedot.yhteysTiedot",
  });

  return (
    <Section>
      <SectionContent>
        <h2 className="vayla-title">Kuulutuksessa esitettävät yhteystiedot</h2>
        <p>
          Voit valita kuulutuksessa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden yhteystiedon.
          Projektipäällikön tiedot esitetään aina. Projektiin tallennettujen henkilöiden yhteystiedot haetaan Projektin henkilöt -sivulle
          tallennetuista tiedoista.
        </p>
        {projekti?.kayttoOikeudet && projekti.kayttoOikeudet.length > 0 ? (
          <Controller
            control={control}
            name={`nahtavillaoloVaihe.kuulutusYhteystiedot.yhteysHenkilot`}
            render={({ field: { onChange, value, ...field } }) => (
              <FormGroup label="Projektiin tallennetut henkilöt" inlineFlex>
                {(projekti as Projekti).kayttoOikeudet?.map(({ etunimi, sukunimi, tyyppi, kayttajatunnus }, index) => {
                  const tunnuslista: string[] = value || [];
                  const nimi = formatNimi({ sukunimi, etunimi });
                  return (
                    <Fragment key={index}>
                      {tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO ? (
                        <FormControlLabel sx={{ marginLeft: "0px" }} label={nimi} control={<Checkbox checked disabled {...field} />} />
                      ) : (
                        <FormControlLabel
                          sx={{ marginLeft: "0px" }}
                          label={nimi}
                          control={
                            <Checkbox
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
                          }
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
          Lisää uudelle yhteystiedolle rivi Lisää uusi -painikkeella. Huomioi, että uusi yhteystieto ei tallennu Projektin henkilöt -sivulle
          eikä henkilölle tule käyttöoikeuksia projektiin.{" "}
        </p>
      </SectionContent>
      {fields.map((field, index) => (
        <HassuStack key={field.id} direction={["column", "column", "row"]}>
          <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 3]}>
            <TextInput
              label="Etunimi *"
              {...register(`nahtavillaoloVaihe.kuulutusYhteystiedot.yhteysTiedot.${index}.etunimi`)}
              error={(errors as any)?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot?.[index]?.etunimi}
            />
            <TextInput
              label="Sukunimi *"
              {...register(`nahtavillaoloVaihe.kuulutusYhteystiedot.yhteysTiedot.${index}.sukunimi`)}
              error={(errors as any)?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot?.[index]?.sukunimi}
            />
            <TextInput
              label="Organisaatio / kunta *"
              {...register(`nahtavillaoloVaihe.kuulutusYhteystiedot.yhteysTiedot.${index}.organisaatio`)}
              error={(errors as any)?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot?.[index]?.organisaatio}
            />
            <TextInput
              label="Puhelinnumero *"
              {...register(`nahtavillaoloVaihe.kuulutusYhteystiedot.yhteysTiedot.${index}.puhelinnumero`)}
              error={(errors as any)?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot?.[index]?.puhelinnumero}
              maxLength={maxPhoneLength}
            />
            <TextInput
              label="Sähköpostiosoite *"
              {...register(`nahtavillaoloVaihe.kuulutusYhteystiedot.yhteysTiedot.${index}.sahkoposti`)}
              error={(errors as any)?.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot?.[index]?.sahkoposti}
            />
          </HassuGrid>
          <div>
            <div className="hidden lg:block lg:mt-8">
              <IconButton
                name="contact_info_trash_button"
                icon="trash"
                onClick={(event) => {
                  event.preventDefault();
                  remove(index);
                }}
                disabled={false}
              />
            </div>
            <div className="block lg:hidden">
              <Button
                onClick={(event) => {
                  event.preventDefault();
                  remove(index);
                }}
                endIcon="trash"
                disabled={false}
              >
                Poista
              </Button>
            </div>
          </div>
        </HassuStack>
      ))}
      <Button
        id="add_new_contact"
        onClick={(event) => {
          event.preventDefault();
          append(defaultYhteystieto);
        }}
        disabled={false}
      >
        Lisää uusi +
      </Button>
    </Section>
  );
}
