import React, { ReactElement, useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import Section from "@components/layout/Section";
import { Kieli, Projekti } from "../../../common/graphql/apiModel";
import SectionContent from "@components/layout/SectionContent";
import ProjektiEuRahoitusLogoInput from "@components/projekti/ProjektiEuRahoitusLogoInput";
import Notification, { NotificationType } from "@components/notification/Notification";
import { isAllowedToChangeEuRahoitus } from "common/util/operationValidators";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { getKaannettavatKielet } from "common/kaannettavatKielet";

interface Props {
  projekti?: Projekti | null;
  formDisabled?: boolean;
}
export default function ProjektiEuRahoitusTiedot({ projekti, formDisabled }: Props): ReactElement {
  const { watch, control } = useFormContext<FormValues>();

  const logoFIUrlWatch = watch("euRahoitusLogot.SUOMI") as string | File | null | undefined;
  const logoSVUrlWatch = watch("euRahoitusLogot.RUOTSI") as string | File | null | undefined;

  const [logoFIUrl, setLogoFIUrl] = useState<string | undefined>(undefined);
  const [logoSVUrl, setLogoSVUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (logoFIUrlWatch instanceof File) {
      setLogoFIUrl(URL.createObjectURL(logoFIUrlWatch));
    } else if (typeof logoFIUrlWatch === "string" || logoFIUrlWatch === null) {
      setLogoFIUrl(logoFIUrlWatch || undefined);
    }
  }, [logoFIUrlWatch]);

  useEffect(() => {
    if (logoSVUrlWatch instanceof File) {
      setLogoSVUrl(URL.createObjectURL(logoSVUrlWatch));
    } else if (typeof logoSVUrlWatch === "string" || logoSVUrlWatch === null) {
      setLogoSVUrl(logoSVUrlWatch || undefined);
    }
  }, [logoSVUrlWatch]);

  const kielitiedot = watch("kielitiedot");

  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  if (!projekti) {
    return <></>;
  }

  const euRahoitusCanBeChanged = isAllowedToChangeEuRahoitus(projekti);
  const disabled = formDisabled || !euRahoitusCanBeChanged;

  return (
    <Section smallGaps>
      <h4 className="vayla-small-title">EU-rahoitus</h4>
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
                  <ProjektiEuRahoitusLogoInput
                    lang={ensisijainenKaannettavaKieli}
                    isPrimaryLang
                    logoUrl={ensisijainenKaannettavaKieli === Kieli.SUOMI ? logoFIUrl : logoSVUrl}
                    disabled={formDisabled}
                  />
                )}
                {toissijainenKaannettavaKieli && (
                  <ProjektiEuRahoitusLogoInput
                    lang={toissijainenKaannettavaKieli}
                    isPrimaryLang={false}
                    logoUrl={toissijainenKaannettavaKieli === Kieli.SUOMI ? logoFIUrl : logoSVUrl}
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
