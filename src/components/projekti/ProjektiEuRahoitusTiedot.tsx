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
  const isSuomiSelected = lang1FromForm === Kieli.SUOMI || lang2FromForm === Kieli.SUOMI;
  const isRuotsiSelected = lang1FromForm === Kieli.RUOTSI || lang2FromForm === Kieli.RUOTSI;

  useEffect(() => {
    console.log("moi eu tiedot effect");
    console.log(projekti?.euRahoitus);
    console.log(projekti?.euRahoitusLogot);
    console.log({ ...register("euRahoitus") });
    setHasEuRahoitus(!!projekti?.euRahoitus);
    setLogoSVUrl(projekti?.euRahoitusLogot?.logoSV || undefined);
    setLogoFIUrl(projekti?.euRahoitusLogot?.logoFI || undefined);
  }, [projekti, setHasEuRahoitus, setLogoSVUrl, setLogoFIUrl]);

  return (
    <Section smallGaps>
      <h4 className="vayla-small-title">EU-rahoitus</h4>

      <FormGroup label="Rahoittaako EU suunnitteluhanketta? *" errorMessage={errors?.euRahoitus?.message} flexDirection="row">
        <RadioButton
          label="Kyllä"
          value="true"
          {...register("euRahoitusProjekti")}
          onChange={() => {
            setHasEuRahoitus(true);
          }}
        />
        <RadioButton
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
          <ProjektiEuRahoitusLogoInput
            projekti={projekti}
            lang={Kieli.SUOMI}
            isPrimaryLang={isSuomiPrimary}
            isLangChosen={isSuomiSelected}
            setLogoUrl={setLogoFIUrl}
            logoUrl={logoFIUrl}
            logoField={"euRahoitusLogot.logoFI"}
          />
          <ProjektiEuRahoitusLogoInput
            projekti={projekti}
            lang={Kieli.RUOTSI}
            isPrimaryLang={isRuotsiPrimary}
            isLangChosen={isRuotsiSelected}
            setLogoUrl={setLogoSVUrl}
            logoUrl={logoSVUrl}
            logoField={"euRahoitusLogot.logoSV"}
          />
        </SectionContent>
      )}
    </Section>
  );
}
