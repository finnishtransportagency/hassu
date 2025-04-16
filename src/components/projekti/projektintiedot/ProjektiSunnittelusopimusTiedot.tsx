import React, { ReactElement } from "react";
import { Projekti, ProjektiTyyppi } from "@services/api";
import { Controller, useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { kuntametadata } from "hassu-common/kuntametadata";
import Notification, { NotificationType } from "@components/notification/Notification";
import { isAllowedToChangeSuunnittelusopimus } from "hassu-common/util/operationValidators";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";
import Button from "@components/button/Button";
import { H3 } from "@components/Headings";
import SuunnittelusopimusOsapuoli from "./SuunnittelusopimusOsapuoli";

interface Props {
  projekti?: Projekti | null;
  formDisabled?: boolean;
}

export default function ProjektiPerustiedot({ formDisabled, projekti }: Props): ReactElement {
  const { watch, control } = useFormContext<FormValues>();

  const kuntaOptions = kuntametadata.kuntaOptions("fi");

  const hide = projekti?.velho.tyyppi === ProjektiTyyppi.RATA || projekti?.velho.tyyppi === ProjektiTyyppi.YLEINEN;

  if (!kuntaOptions || kuntaOptions.length == 0 || hide || !projekti) {
    return <></>;
  }

  const suunnitteluSopimusCanBeChanged = isAllowedToChangeSuunnittelusopimus(projekti);

  const disabled = formDisabled || !suunnitteluSopimusCanBeChanged;

  const kielitiedot = watch("kielitiedot");
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet({
    ensisijainenKieli: kielitiedot.ensisijainenKieli ? kielitiedot.ensisijainenKieli : undefined,
    toissijainenKieli: kielitiedot.toissijainenKieli ? kielitiedot.toissijainenKieli : undefined,
  });

  return (
    <Section smallGaps>
      <H3>Suunnittelusopimus</H3>
      {disabled && (
        <Notification type={NotificationType.INFO_GRAY}>
          Et voi muuttaa suunnittelusopimuksen olemassaoloa, koska aloituskuulutus on julkaistu tai odottaa hyväksyntää. Voit kuitenkin
          muuttaa kunnan edustajan tietoja.
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
              Valintaan voi vaikuttaa aloituskuulutuksen tekemiseen saakka, jonka jälkeen valinta lukittuu. Kunnan edustaja on mahdollista
              vaihtaa myös prosessin aikana.
            </p>

            {field.value === "true" && (
              <Controller
                name={"suunnitteluSopimus.osapuoliMaara" as any}
                control={control}
                defaultValue={null}
                shouldUnregister={true}
                render={({ field: osapuoliMaaraField }) => {
                  const osapuoliMaara = parseInt(osapuoliMaaraField.value) || 1;

                  const renderLisaaUusi = () => (
                    <SectionContent>
                      <div style={{ marginTop: "5rem" }}>
                        <p>Lisää uusi suunnittelusopimuksen osapuoli</p>
                      </div>
                      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
                        <Button
                          disabled={disabled}
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
                        disabled={disabled}
                        kuntaOptions={kuntaOptions}
                        ensisijainenKaannettavaKieli={ensisijainenKaannettavaKieli || undefined}
                        toissijainenKaannettavaKieli={toissijainenKaannettavaKieli || undefined}
                        watch={watch}
                        poistaOsapuoli={i > 1 ? () => osapuoliMaaraField.onChange(osapuoliMaara - 1) : undefined}
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
