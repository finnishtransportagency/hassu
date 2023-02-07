import React, { ReactElement, useEffect, useState } from "react";
import RadioButton from "@components/form/RadioButton";
import { useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import Section from "@components/layout/Section";
import { Kieli, KielitiedotInput, Projekti } from "../../../common/graphql/apiModel";
import SectionContent from "@components/layout/SectionContent";
import ProjektiEuRahoitusLogoInput from "@components/projekti/ProjektiEuRahoitusLogoInput";

interface Props {
  projekti?: Projekti | null;
}
export default function ProjektiEuRahoitusTiedot({ projekti }: Props): ReactElement {
  const {
    register,
    formState: { errors },
    getValues,
  } = useFormContext<FormValues>();

  const [hasEuRahoitus, setHasEuRahoitus] = useState(false);
  const [logoSVUrl, setLogoSVUrl] = useState<string | undefined>(undefined);

  const kielitiedot: KielitiedotInput | null | undefined = getValues("kielitiedot");

  const lang1FromForm = kielitiedot?.ensisijainenKieli;
  const lang2FromForm = kielitiedot?.toissijainenKieli;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const isLang1Selected = lang1FromForm !== undefined && lang1FromForm !== null && lang1FromForm !== "";
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const isLang2Selected = lang2FromForm !== undefined && lang2FromForm != null && lang2FromForm !== "";
  const lang1 = isLang1Selected ? lang1FromForm : isLang2Selected && lang2FromForm === Kieli.SUOMI ? Kieli.RUOTSI : Kieli.SUOMI;
  const isSuomiPrimary = lang1 === Kieli.SUOMI;
  const isRuotsiPrimary = lang1 === Kieli.RUOTSI;
  const isSuomiSelected = lang1FromForm === Kieli.SUOMI || lang2FromForm === Kieli.SUOMI;
  const isRuotsiSelected = lang1FromForm === Kieli.RUOTSI || lang2FromForm === Kieli.RUOTSI;

  useEffect(() => {
    console.log("moi");
    console.log(!!projekti?.euRahoitus);
    console.log(!!projekti?.suunnitteluSopimus);
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
          {...register("euRahoitus")}
          onChange={() => {
            setHasEuRahoitus(true);
          }}
        />
        <RadioButton
          label="Ei"
          value="false"
          {...register("euRahoitus")}
          onChange={() => {
            setHasEuRahoitus(false);
          }}
        />
      </FormGroup>

      {hasEuRahoitus && (
        <SectionContent>
          <h5 className="vayla-smallest-title">EU-rahoituksen logo</h5>
          <ProjektiEuRahoitusLogoInput lang={Kieli.SUOMI} isPrimaryLang={isSuomiPrimary} isLangChosen={isSuomiSelected} />
          <ProjektiEuRahoitusLogoInput lang={Kieli.RUOTSI} isPrimaryLang={isRuotsiPrimary} isLangChosen={isRuotsiSelected} />
        </SectionContent>
      )}
    </Section>
  );
}
