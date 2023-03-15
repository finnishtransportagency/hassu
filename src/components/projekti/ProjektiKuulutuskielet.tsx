import React, { ReactElement, useEffect, useState } from "react";
import TextInput from "@components/form/TextInput";
import { useFormContext } from "react-hook-form";
import Select from "@components/form/Select";
import { Kieli } from "@services/api";
import lowerCase from "lodash/lowerCase";
import HassuGrid from "@components/HassuGrid";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";

export default function ProjektiKuulutuskielet(): ReactElement {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext(); // retrieve all hook methods

  const kielioptionsKaikki = [{ label: "Valitse", value: "" }].concat(
    Object.entries(Kieli).map(([k, v]) => ({ label: lowerCase(k), value: v }))
  );
  const kielioptions = kielioptionsKaikki.filter((kielivalinta) => kielivalinta.value !== Kieli.POHJOISSAAME);
  const [kielioptions2, setKielioptions2] = useState(kielioptionsKaikki.filter((kielivalinta) => kielivalinta.value !== Kieli.SUOMI));
  const [vieraskieliEnsisijainen, setVieraskieliEnsisijainen] = useState("");
  const kieli1 = watch("kielitiedot.ensisijainenKieli");
  const kieli2 = watch("kielitiedot.toissijainenKieli");

  useEffect(() => {
    if (kieli1 && kieli1 === Kieli.RUOTSI) {
      setKielioptions2(kielioptionsKaikki.filter((kielivalinta) => kielivalinta.value === Kieli.SUOMI));
      setValue("kielitiedot.toissijainenKieli", Kieli.SUOMI);
      setVieraskieliEnsisijainen(kieli1);
    } else {
      setKielioptions2(kielioptionsKaikki.filter((kielivalinta) => kielivalinta.value !== Kieli.SUOMI));
      if (kieli2 === Kieli.SUOMI) {
        setValue("kielitiedot.toissijainenKieli", "");
      }
      setVieraskieliEnsisijainen("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kieli1]);

  const hasVieraskieli = () => {
    if (kieli1 && kieli1 === Kieli.RUOTSI) {
      return true;
    }
    if (kieli2 && (kieli2 === Kieli.RUOTSI || kieli2 === Kieli.POHJOISSAAME)) {
      return true;
    }
    return false;
  };

  return (
    <Section>
      <SectionContent>
        <h4 className="vayla-small-title">Projektin kuulutusten kielet</h4>
        <HassuGrid cols={{ lg: 3 }}>
          <Select
            label="Ensisijainen kieli *"
            options={kielioptions}
            error={errors.kielitiedot?.ensisijainenKieli}
            {...register("kielitiedot.ensisijainenKieli")}
          />
          <Select
            label="Toissijainen kieli "
            options={kielioptions2}
            error={errors.kielitiedot?.toissijainenKieli}
            {...register("kielitiedot.toissijainenKieli", {
              setValueAs: (v) => (v ? v : null), // send unselected as null instead of empty string
            })}
          />
        </HassuGrid>
      </SectionContent>
      {hasVieraskieli() && (
        <TextInput
          label={`Projektin nimi ${vieraskieliEnsisijainen ? lowerCase(vieraskieliEnsisijainen) : lowerCase(kieli2)}n kielellä *`}
          error={errors.kielitiedot?.projektinNimiVieraskielella}
          {...register("kielitiedot.projektinNimiVieraskielella", { shouldUnregister: true })}
        />
      )}
      <p>Huomaa, että valinta vaikuttaa siihen, mitä kenttiä järjestelmässä näytetään kuulutusten yhteydessä.</p>
    </Section>
  );
}
