import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import { Yhteystieto, YhteystietoInput } from "@services/api";
import Section from "@components/layout/Section";
import { Fragment, ReactElement, useMemo } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import FormGroup from "@components/form/FormGroup";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import { maxPhoneLength } from "hassu-common/schema/puhelinNumero";
import IconButton from "@components/button/IconButton";
import { useProjekti } from "src/hooks/useProjekti";
import { VuorovaikutusFormValues } from ".";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import useTranslation from "next-translate/useTranslation";
import { Checkbox, FormControlLabel } from "@mui/material";
import { H2 } from "../../../Headings";

const defaultYhteystieto: YhteystietoInput = {
  etunimi: "",
  sukunimi: "",
  organisaatio: "",
  puhelinnumero: "",
  sahkoposti: "",
};

interface Props {
  projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[];
}

export default function EsitettavatYhteystiedot({ projektiHenkilot }: Props): ReactElement {
  const { data: projekti } = useProjekti();

  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<VuorovaikutusFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "vuorovaikutusKierros.esitettavatYhteystiedot.yhteysTiedot",
  });

  const { t } = useTranslation();

  const suunnitteluSopimus = projekti?.suunnitteluSopimus;
  const isSuunnitteluSopimus = suunnitteluSopimus?.osapuolet && suunnitteluSopimus?.osapuolet.length > 0;

  const osapuoltenHenkilot = useMemo(() => {
    if (!isSuunnitteluSopimus) return [];

    const henkilot = [] as any;
    suunnitteluSopimus?.osapuolet?.forEach((osapuoli) => {
      if (osapuoli?.osapuolenHenkilot && osapuoli.osapuolenHenkilot.length > 0) {
        const organisaationNimi = osapuoli.osapuolenNimiFI;
        osapuoli.osapuolenHenkilot
          .filter((henkilo) => henkilo?.valittu === true)
          .forEach((henkilo) => {
            henkilot.push({
              ...henkilo,
              organisaatio: henkilo?.yritys || organisaationNimi || "",
            });
          });
      }
    });
    return henkilot;
  }, [isSuunnitteluSopimus, suunnitteluSopimus]);

  const henkiloListalle = (henkilo: { etunimi: any; sukunimi: any; organisaatio: string; email: string; puhelinnumero: string }) => {
    const nimi = `${henkilo.etunimi || ""} ${henkilo.sukunimi || ""}`.trim();
    const organisaatio = henkilo.organisaatio || "";
    const email = henkilo.email || "";
    const puhelin = henkilo.puhelinnumero || "";

    let muotoiltuNimi = nimi;
    if (organisaatio) muotoiltuNimi += `, (${organisaatio})`;
    if (puhelin) muotoiltuNimi += `, ${puhelin}`;
    if (email) muotoiltuNimi += `, ${email}`;

    return muotoiltuNimi;
  };

  return (
    <Section className="mt-8">
      <SectionContent>
        <H2>Kutsussa esitettävät yhteystiedot</H2>
        <p>
          Voit valita kutsussa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden yhteystiedon. Projektipäällikön
          tiedot esitetään aina. Projektiin tallennettujen henkilöiden yhteystiedot haetaan Projektin henkilöt -sivulle tallennetuista
          tiedoista.
        </p>
        {isSuunnitteluSopimus && osapuoltenHenkilot.length > 0 && (
          <FormGroup label="Suunnittelusopimukseen tallennetut osapuolten henkilöt" inlineFlex>
            {osapuoltenHenkilot.map(
              (henkilo: { etunimi: any; sukunimi: any; organisaatio: string; email: string; puhelinnumero: string }, index: any) => (
                <FormControlLabel
                  key={`osapuoli-henkilo-${index}`}
                  sx={{ marginLeft: "0px" }}
                  label={henkiloListalle(henkilo)}
                  control={<Checkbox checked disabled />}
                />
              )
            )}
          </FormGroup>
        )}
        {projekti?.kayttoOikeudet && projekti.kayttoOikeudet.length > 0 ? (
          <Controller
            control={control}
            name={`vuorovaikutusKierros.esitettavatYhteystiedot.yhteysHenkilot`}
            render={({ field: { onChange, value, ...field } }) => (
              <FormGroup label="Projektiin tallennetut henkilöt" inlineFlex>
                {projektiHenkilot.map((hlo, index) => {
                  const tunnuslista = value || [];
                  return (
                    <Fragment key={index}>
                      {index === 0 ? (
                        <FormControlLabel
                          sx={{ marginLeft: "0px" }}
                          label={yhteystietoVirkamiehelleTekstiksi(hlo, t)}
                          control={<Checkbox checked disabled {...field} />}
                        />
                      ) : (
                        <FormControlLabel
                          sx={{ marginLeft: "0px" }}
                          label={yhteystietoVirkamiehelleTekstiksi(hlo, t)}
                          control={
                            <Checkbox
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
        <div className="vayla-label">Uusi yhteystieto</div>
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
              {...register(`vuorovaikutusKierros.esitettavatYhteystiedot.yhteysTiedot.${index}.etunimi`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.etunimi}
            />
            <TextInput
              label="Sukunimi *"
              {...register(`vuorovaikutusKierros.esitettavatYhteystiedot.yhteysTiedot.${index}.sukunimi`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.sukunimi}
            />
            <TextInput
              label="Organisaatio / kunta *"
              {...register(`vuorovaikutusKierros.esitettavatYhteystiedot.yhteysTiedot.${index}.organisaatio`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.organisaatio}
            />
            <TextInput
              label="Puhelinnumero *"
              {...register(`vuorovaikutusKierros.esitettavatYhteystiedot.yhteysTiedot.${index}.puhelinnumero`)}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.esitettavatYhteystiedot?.[index]?.puhelinnumero}
              maxLength={maxPhoneLength}
            />
            <TextInput
              label="Sähköpostiosoite *"
              {...register(`vuorovaikutusKierros.esitettavatYhteystiedot.yhteysTiedot.${index}.sahkoposti`)}
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
        Lisää uusi +
      </Button>
    </Section>
  );
}
