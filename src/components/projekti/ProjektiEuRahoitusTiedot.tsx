import React, { ReactElement, useEffect, useState } from "react";
import RadioButton from "@components/form/RadioButton";
import { useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import Section from "@components/layout/Section";
import { Kieli, KielitiedotInput, Projekti } from "../../../common/graphql/apiModel";
import SectionContent from "@components/layout/SectionContent";
import ProjektiEuRahoitusLogoInput from "@components/projekti/ProjektiEuRahoitusLogoInput";
import Notification, { NotificationType } from "@components/notification/Notification";
import { isAllowedToChangeEuRahoitus } from "common/util/operationValidators";

interface Props {
  projekti?: Projekti | null;
  formDisabled?: boolean;
}
export default function ProjektiEuRahoitusTiedot({ projekti, formDisabled }: Props): ReactElement {
  const {
    register,
    formState: { errors },
    getValues,
  } = useFormContext<FormValues>();

  const [hasEuRahoitus, setHasEuRahoitus] = useState(false);
  const [logoSVUrl, setLogoSVUrl] = useState<string | undefined>(undefined);
  const [logoFIUrl, setLogoFIUrl] = useState<string | undefined>(undefined);
  const kielitiedot: KielitiedotInput | null | undefined = getValues("kielitiedot");

  const lang1FromForm = kielitiedot?.ensisijainenKieli;
  const lang2FromForm = kielitiedot?.toissijainenKieli;

  // @ts-ignore
  const isLang1Selected = lang1FromForm !== undefined && lang1FromForm !== null && lang1FromForm !== "";

  // @ts-ignore
  const isLang2Selected = lang2FromForm !== undefined && lang2FromForm != null && lang2FromForm !== "";
  const lang1 = isLang1Selected ? lang1FromForm : isLang2Selected && lang2FromForm === Kieli.SUOMI ? Kieli.RUOTSI : Kieli.SUOMI;
  const isSuomiPrimary = lang1 === Kieli.SUOMI;
  const isRuotsiPrimary = lang1 === Kieli.RUOTSI;
  const isRuotsiSelected = lang1FromForm === Kieli.RUOTSI || lang2FromForm === Kieli.RUOTSI;

  useEffect(() => {
    setHasEuRahoitus(!!projekti?.euRahoitus);
    setLogoSVUrl(projekti?.euRahoitusLogot?.logoSV || undefined);
    setLogoFIUrl(projekti?.euRahoitusLogot?.logoFI || undefined);
  }, [projekti, setHasEuRahoitus, setLogoSVUrl, setLogoFIUrl]);

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
      <FormGroup label="Rahoittaako EU suunnitteluhanketta? *" errorMessage={errors?.euRahoitus?.message} flexDirection="row">
        <RadioButton
          disabled={disabled}
          label="Kyllä"
          value="true"
          {...register("euRahoitusProjekti")}
          onChange={() => {
            setHasEuRahoitus(true);
          }}
        />
        <RadioButton
          disabled={disabled}
          label="Ei"
          value="false"
          {...register("euRahoitusProjekti")}
          onChange={() => {
            setHasEuRahoitus(false);
          }}
        />
      </FormGroup>

      {hasEuRahoitus && (
        <SectionContent>
          <h5 className="vayla-smallest-title">EU-rahoituksen logo</h5>
          {isRuotsiSelected && isRuotsiPrimary && (
            <ProjektiEuRahoitusLogoInput
              projekti={projekti}
              lang={Kieli.RUOTSI}
              isPrimaryLang={isRuotsiPrimary}
              setLogoUrl={setLogoSVUrl}
              logoUrl={logoSVUrl}
              logoField={"euRahoitusLogot.logoSV"}
              disabled={formDisabled}
            />
          )}
          <ProjektiEuRahoitusLogoInput
            projekti={projekti}
            lang={Kieli.SUOMI}
            isPrimaryLang={isSuomiPrimary}
            setLogoUrl={setLogoFIUrl}
            logoUrl={logoFIUrl}
            logoField={"euRahoitusLogot.logoFI"}
            disabled={formDisabled}
          />
          {isRuotsiSelected && !isRuotsiPrimary && (
            <ProjektiEuRahoitusLogoInput
              projekti={projekti}
              lang={Kieli.RUOTSI}
              isPrimaryLang={isRuotsiPrimary}
              setLogoUrl={setLogoSVUrl}
              logoUrl={logoSVUrl}
              logoField={"euRahoitusLogot.logoSV"}
              disabled={formDisabled}
            />
          )}
        </SectionContent>
      )}
      <p>Valintaan voi vaikuttaa aloituskuulutuksen hyväksymiseen saakka, jonka jälkeen valinta lukittuu.</p>
    </Section>
  );
}
