import React, { ReactElement } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import Section from "@components/layout/Section";
import { Projekti } from "hassu-common/graphql/apiModel";
import SectionContent from "@components/layout/SectionContent";
import ProjektiEuRahoitusLogoInput from "@components/projekti/ProjektiEuRahoitusLogoInput";
import Notification, { NotificationType } from "@components/notification/Notification";
import { isAllowedToChangeEuRahoitus } from "hassu-common/util/operationValidators";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { H3 } from "../Headings";

interface Props {
  projekti?: Projekti | null;
  formDisabled?: boolean;
}
export default function ProjektiEuRahoitusTiedot({ projekti, formDisabled }: Props): ReactElement {
  const { watch, control } = useFormContext<FormValues>();

  const kielitiedot = watch("kielitiedot");

  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet({
    ensisijainenKieli: kielitiedot.ensisijainenKieli ? kielitiedot.ensisijainenKieli : undefined,
    toissijainenKieli: kielitiedot.toissijainenKieli ? kielitiedot.toissijainenKieli : undefined,
  });

  if (!projekti) {
    return <></>;
  }

  const euRahoitusCanBeChanged = isAllowedToChangeEuRahoitus(projekti);
  const disabled = formDisabled || !euRahoitusCanBeChanged;

  return (
    <Section smallGaps>
      <H3>EU-rahoitus</H3>
      {disabled && (
        <Notification type={NotificationType.INFO_GRAY}>
          Et voi muuttaa EU-rahoituksen olemassaoloa, koska aloituskuulutus on julkaistu tai odottaa hyväksyntää.
        </Notification>
      )}
      <Controller
        name="euRahoitus"
        control={control}
        render={({ field, fieldState }) => (
          <>
            <FormGroup label="Rahoittaako EU suunnitteluhanketta? *" errorMessage={fieldState.error?.message} flexDirection="row">
              <RadioGroup
                aria-labelledby="demo-controlled-radio-buttons-group"
                row
                value={field.value}
                onChange={(value) => {
                  field.onChange(value.target.value === "true" ? true : false);
                }}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
              >
                <FormControlLabel value={true} disabled={disabled} control={<Radio />} label="Kyllä" />
                <FormControlLabel value={false} disabled={disabled} control={<Radio />} label="Ei" />
              </RadioGroup>
            </FormGroup>
            {field.value === true && (
              <SectionContent>
                <h5 className="vayla-smallest-title">EU-rahoituksen logo</h5>
                {ensisijainenKaannettavaKieli && (
                  <ProjektiEuRahoitusLogoInput<FormValues>
                    lang={ensisijainenKaannettavaKieli}
                    isPrimaryLang
                    name={`euRahoitusLogot.${ensisijainenKaannettavaKieli}`}
                    disabled={formDisabled}
                  />
                )}
                {toissijainenKaannettavaKieli && (
                  <ProjektiEuRahoitusLogoInput<FormValues>
                    lang={toissijainenKaannettavaKieli}
                    isPrimaryLang={false}
                    name={`euRahoitusLogot.${toissijainenKaannettavaKieli}`}
                    disabled={formDisabled}
                  />
                )}
              </SectionContent>
            )}
          </>
        )}
      />
      <p>Valintaan voi vaikuttaa aloituskuulutuksen tekemiseen saakka, jonka jälkeen valinta lukittuu.</p>
    </Section>
  );
}
