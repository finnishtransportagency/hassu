import React, { ReactElement } from "react";
import { Projekti, ProjektiTyyppi } from "@services/api";
import { Controller, useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { kuntametadata } from "hassu-common/kuntametadata";
import Notification, { NotificationType } from "@components/notification/Notification";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";
import Button from "@components/button/Button";
import { H3, H4 } from "@components/Headings";
import SuunnittelusopimusOsapuoli from "./SuunnittelusopimusOsapuoli";
import HassuGrid from "@components/HassuGrid";
import { formatNimi } from "src/util/userUtil";
import ProjektiSuunnittelusopimusLogoInput from "./ProjektiSuunnittelusopimusLogoInput";
import Select from "@components/form/Select";

interface Props {
  projekti?: Projekti | null;
  formDisabled?: boolean;
}

export default function ProjektiPerustiedot({ formDisabled, projekti }: Props): ReactElement {
  const {
    watch,
    control,
    register,
    formState: { errors },
  } = useFormContext<FormValues>();

  const kuntaOptions = kuntametadata.kuntaOptions("fi");

  const hide = projekti?.velho.tyyppi === ProjektiTyyppi.RATA || projekti?.velho.tyyppi === ProjektiTyyppi.YLEINEN;

  if (!kuntaOptions || kuntaOptions.length == 0 || hide || !projekti) {
    return <></>;
  }

  //palauta nämä ja disabledin käyttö alla sitten, kun palautetaan kyllä/ei-valinnan lukittuminen aloituskuulutuksen myötä.
  //const suunnitteluSopimusCanBeChanged = isAllowedToChangeSuunnittelusopimus(projekti);
  //const disabled = formDisabled || !suunnitteluSopimusCanBeChanged;

  const isVanhatTiedotOlemassa =
    typeof projekti.suunnitteluSopimus?.yhteysHenkilo === "string" && projekti.suunnitteluSopimus?.yhteysHenkilo.length > 0;

  const kielitiedot = watch("kielitiedot");
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet({
    ensisijainenKieli: kielitiedot.ensisijainenKieli ? kielitiedot.ensisijainenKieli : undefined,
    toissijainenKieli: kielitiedot.toissijainenKieli ? kielitiedot.toissijainenKieli : undefined,
  });

  return (
    <Section smallGaps>
      <H3>Suunnittelusopimus</H3>
      {/* {disabled && ( )} */}
      {isVanhatTiedotOlemassa && (
        <Notification type={NotificationType.INFO_GRAY}>
          Voit poikkeuksellisesti muuttaa suunnittelusopimuksen olemassaoloa, vaikka aloituskuulutus on jo julkaistu. Jos haluat muuttaa
          edustajan tietoja, poista ensin vanhat tiedot ja tallenna lomake. Lisää sen jälkeen niiden edustajien tiedot, joiden haluat
          näkyvän kansalaispuolella sekä kirjeissä.
        </Notification>
      )}
      <Controller
        name="suunnittelusopimusprojekti"
        control={control}
        render={({ field, fieldState }) => (
          <>
            <FormGroup
              label="Onko kyseessä suunnittelusopimuksella toteutettava suunnitteluhanke? *"
              errorMessage={fieldState.error?.message}
              flexDirection="row"
            >
              <RadioGroup
                aria-labelledby="demo-controlled-radio-buttons-group"
                row
                value={field.value}
                onChange={(value) => {
                  field.onChange(value.target.value);
                }}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
              >
                <FormControlLabel value="true" disabled={false} control={<Radio />} label="Kyllä" />
                <FormControlLabel value="false" disabled={false} control={<Radio />} label="Ei" />
              </RadioGroup>
            </FormGroup>

            {/* Palauta tämä teksti ja poista alla oleva osio sitten, kun palautetaan kyllä/ei-valinnan lukittuminen aloituskuulutuksen myötä. 
            <p>
              Valintaan voi vaikuttaa aloituskuulutuksen tekemiseen saakka, jonka jälkeen valinta lukittuu. Kunnan edustaja on mahdollista
              vaihtaa myös prosessin aikana.
            </p> */}

            {field.value === "true" && isVanhatTiedotOlemassa && (
              <Controller
                name="suunnitteluSopimus"
                control={control}
                defaultValue={null}
                shouldUnregister={true}
                render={() => (
                  <SectionContent largeGaps sx={{ marginLeft: 4 }}>
                    <SectionContent>
                      <H4>Kunnan edustajan tiedot</H4>
                      <p>
                        Kunnan edustajaksi merkitty henkilö näkyy automaattisesti valittuna aloituskuulutuksen ja vuorovaikutusten
                        yhteystiedoissa.
                      </p>
                      <HassuGrid cols={{ lg: 3 }}>
                        <Select
                          id="suunnittelusopimus_yhteyshenkilo"
                          label="Henkilö *"
                          options={
                            projekti?.kayttoOikeudet?.map((kayttaja) => ({
                              label: formatNimi(kayttaja),
                              value: kayttaja.kayttajatunnus,
                            })) || []
                          }
                          emptyOption="Valitse"
                          error={(errors as any).suunnitteluSopimus?.yhteysHenkilo}
                          disabled={false}
                          {...register("suunnitteluSopimus.yhteysHenkilo", { shouldUnregister: true })}
                        />
                        <Select
                          id="suunnittelusopimus_kunta"
                          label="Kunta *"
                          options={kuntaOptions ? kuntaOptions : [{ label: "", value: "" }]}
                          error={(errors as any).suunnitteluSopimus?.kunta}
                          disabled={formDisabled}
                          {...register("suunnitteluSopimus.kunta", { shouldUnregister: true })}
                        />
                      </HassuGrid>
                    </SectionContent>
                    <SectionContent>
                      <H4>Kunnan logo</H4>
                      {ensisijainenKaannettavaKieli && (
                        <ProjektiSuunnittelusopimusLogoInput<FormValues>
                          lang={ensisijainenKaannettavaKieli}
                          isPrimaryLang
                          name={`suunnitteluSopimus.logo.${ensisijainenKaannettavaKieli}`}
                          disabled={formDisabled}
                        />
                      )}
                      {toissijainenKaannettavaKieli && (
                        <ProjektiSuunnittelusopimusLogoInput<FormValues>
                          lang={toissijainenKaannettavaKieli}
                          isPrimaryLang={false}
                          name={`suunnitteluSopimus.logo.${toissijainenKaannettavaKieli}`}
                          disabled={formDisabled}
                        />
                      )}
                    </SectionContent>
                  </SectionContent>
                )}
              />
            )}

            {field.value === "true" && !isVanhatTiedotOlemassa && (
              <Controller
                name={"suunnitteluSopimus.osapuoliMaara" as any}
                control={control}
                defaultValue={1}
                render={({ field: osapuoliMaaraField }) => {
                  const osapuoliMaara = parseInt(osapuoliMaaraField.value) || 1;

                  const renderLisaaUusi = () => (
                    <SectionContent>
                      <div style={{ marginTop: "5rem" }}>
                        <p>Lisää uusi suunnittelusopimuksen osapuoli</p>
                      </div>
                      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
                        <Button
                          disabled={formDisabled}
                          onClick={() => {
                            osapuoliMaaraField.onChange(osapuoliMaara + 1);
                          }}
                          type="button"
                          id="lisaa_uusi_osapuoli"
                        >
                          Lisää uusi +
                        </Button>
                      </div>
                    </SectionContent>
                  );

                  const osapuolet = [];
                  for (let i = 1; i <= osapuoliMaara; i++) {
                    osapuolet.push(
                      <SuunnittelusopimusOsapuoli
                        key={`osapuoli-${i}`}
                        osapuoliNumero={i}
                        projekti={projekti}
                        disabled={false}
                        kuntaOptions={kuntaOptions}
                        ensisijainenKaannettavaKieli={ensisijainenKaannettavaKieli || undefined}
                        toissijainenKaannettavaKieli={toissijainenKaannettavaKieli || undefined}
                        watch={watch}
                        poistaOsapuoli={osapuoliMaara > 1 ? () => osapuoliMaaraField.onChange(osapuoliMaara - 1) : undefined}
                        onViimeinenOsapuoli={i === 3}
                      />
                    );

                    if (i === osapuoliMaara && osapuoliMaara < 3) {
                      osapuolet.push(<React.Fragment key="lisaa-uusi-osapuoli">{renderLisaaUusi()}</React.Fragment>);
                    }
                  }

                  return <>{osapuolet}</>;
                }}
              />
            )}
          </>
        )}
      />
    </Section>
  );
}
