import React, { ReactElement, useEffect, useState } from "react";
import RadioButton from "@components/form/RadioButton";
import { useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import Section from "@components/layout/Section";
import { Projekti } from "../../../common/graphql/apiModel";
import SectionContent from "@components/layout/SectionContent";
import ProjektiEuRahoitusLogoInput from "@components/projekti/ProjektiEuRahoitusLogoInput";

interface Props {
  projekti?: Projekti | null;
}
export default function ProjektiEuRahoitusTiedot({ projekti }: Props): ReactElement {
  const {
    formState: { errors },
    getValues,
    control,
  } = useFormContext<FormValues>();

  const [hasEuRahoitus, setHasEuRahoitus] = useState(false);
  const [logoSVUrl, setLogoSVUrl] = useState<string | undefined>(undefined);

  console.log("hello");
  console.log(getValues("kielitiedot"));
  const lang1 = getValues("kielitiedot.ensisijainenKieli");
  const lang2 = getValues("kielitiedot.toissijainenKieli");
  console.log(lang1);

  console.log(lang1);
  console.log(lang2);

  console.log(hasEuRahoitus);
  console.log(control);
  console.log(logoSVUrl);
  //console.log(logoUrl);
  useEffect(() => {
    setHasEuRahoitus(!!projekti?.euRahoitus);
    setLogoSVUrl(projekti?.euRahoitusLogot?.logoSV || undefined);
  }, [projekti, setHasEuRahoitus]);

  return (
    <Section smallGaps>
      <h4 className="vayla-small-title">EU-rahoitus</h4>

      <FormGroup label="Rahoittaako EU suunnitteluhanketta? *" errorMessage={errors?.euRahoitus?.message} flexDirection="row">
        <RadioButton
          label="Kyllä"
          value="true"
          onChange={() => {
            setHasEuRahoitus(true);
          }}
        />
        <RadioButton
          label="Ei"
          value="false"
          onChange={() => {
            setHasEuRahoitus(false);
          }}
        />
      </FormGroup>

      {hasEuRahoitus && (
        <SectionContent>
          <h5 className="vayla-smallest-title">EU-rahoituksen logo</h5>
          <ProjektiEuRahoitusLogoInput />
        </SectionContent>
      )}
    </Section>
  );
}
