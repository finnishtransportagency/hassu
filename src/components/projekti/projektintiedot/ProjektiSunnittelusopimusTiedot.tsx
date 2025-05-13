import React, { ReactElement, useEffect } from "react";
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
import { isAllowedToChangeSuunnittelusopimus } from "common/util/operationValidators";

interface Props {
  projekti?: Projekti | null;
  formDisabled?: boolean;
}

export default function ProjektiPerustiedot({ formDisabled, projekti }: Props): ReactElement {
  const {
    watch,
    control,
    register,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<FormValues>();

  const kuntaOptions = kuntametadata.kuntaOptions("fi");

  const hide = projekti?.velho.tyyppi === ProjektiTyyppi.RATA || projekti?.velho.tyyppi === ProjektiTyyppi.YLEINEN;

  const suunnittelusopimus = watch("suunnittelusopimusprojekti");

  useEffect(() => {
    if (!projekti) return;
    if (suunnittelusopimus === "true" && !getValues("suunnitteluSopimus.osapuoliMaara" as any)) {
      setValue("suunnitteluSopimus.osapuoliMaara" as any, 1);
    }
  }, [suunnittelusopimus, getValues, setValue, projekti]);

  if (!kuntaOptions || kuntaOptions.length == 0 || hide || !projekti) {
    return <></>;
  }

  const suunnitteluSopimusCanBeChanged = isAllowedToChangeSuunnittelusopimus(projekti);
  const disabled = formDisabled || !suunnitteluSopimusCanBeChanged;

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
      {disabled && isVanhatTiedotOlemassa && (
        <Notification type={NotificationType.INFO_GRAY}>
          Jos haluat muuttaa edustajan tietoja, aseta ensin Henkilö-kohta tyhjäksi ja tallenna lomake. Tämän myötä näkyviin tulee uudet
          kentät, joihin voit syöttää suunnittelusopimuksen osapuolet ja osapuolten edustajat, joiden halutaan näkyvän yhteyshenkilöinä
          kansalaispuolella sekä kirjeissä.
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
                <FormControlLabel value="true" disabled={disabled} control={<Radio />} label="Kyllä" />
                <FormControlLabel value="false" disabled={disabled} control={<Radio />} label="Ei" />
              </RadioGroup>
            </FormGroup>

            <p>
              Valintaan voi vaikuttaa aloituskuulutuksen tekemiseen saakka, jonka jälkeen valinta lukittuu. Suunnittelusopimuksen osapuolten
              edustajien tietoja on mahdollista muokata myös prosessin aikana.
            </p>

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
                          emptyOption=" "
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
                  const handlePoistaOsapuoli = (poistettavaIndex: number) => {
                    const sailytettavatOsapuolet = [];
                    for (let osapuoliIndeksi = 1; osapuoliIndeksi <= osapuoliMaara; osapuoliIndeksi++) {
                      if (osapuoliIndeksi !== poistettavaIndex) {
                        const tyyppi = getValues(`suunnitteluSopimus.osapuoli${osapuoliIndeksi}Tyyppi` as any);
                        const osapuoli = getValues(`suunnitteluSopimus.osapuoli${osapuoliIndeksi}` as any);

                        const henkilot = getValues(`suunnitteluSopimus.osapuoli${osapuoliIndeksi}.osapuolenHenkilot` as any) || [];
                        osapuoli.osapuolenHenkilot = [...henkilot];

                        sailytettavatOsapuolet.push({
                          tyyppi,
                          osapuoli,
                        });
                      }
                    }
                    for (let i = 1; i <= osapuoliMaara; i++) {
                      setValue(`suunnitteluSopimus.osapuoli${i}` as any, {});
                      setValue(`suunnitteluSopimus.osapuoli${i}Tyyppi` as any, undefined);
                    }
                    for (let i = 0; i < sailytettavatOsapuolet.length; i++) {
                      const lomakeIndeksi = i + 1;
                      const { tyyppi, osapuoli } = sailytettavatOsapuolet[i];

                      setValue(`suunnitteluSopimus.osapuoli${lomakeIndeksi}Tyyppi` as any, tyyppi);
                      setValue(`suunnitteluSopimus.osapuoli${lomakeIndeksi}` as any, osapuoli);
                      if (osapuoli.osapuolenHenkilot && osapuoli.osapuolenHenkilot.length > 0) {
                        setValue(`suunnitteluSopimus.osapuoli${lomakeIndeksi}.osapuolenHenkilot` as any, osapuoli.osapuolenHenkilot);
                      }
                    }
                    osapuoliMaaraField.onChange(osapuoliMaara - 1);
                  };
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
                        disabled={false}
                        ensisijainenKaannettavaKieli={ensisijainenKaannettavaKieli || undefined}
                        toissijainenKaannettavaKieli={toissijainenKaannettavaKieli || undefined}
                        watch={watch}
                        poistaOsapuoli={osapuoliMaara > 1 ? () => handlePoistaOsapuoli(i) : undefined}
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
