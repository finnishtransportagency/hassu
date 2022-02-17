import React, { ReactElement, useEffect, useState } from "react";
import TextInput from "@components/form/TextInput";
import { useFormContext } from "react-hook-form";
import FormGroup from "@components/form/FormGroup";
import Select from "@components/form/Select";
import { Kieli } from "@services/api";
import { lowerCase } from "lodash";

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
  const kielioptions = kielioptionsKaikki.filter((kielivalinta) => kielivalinta.value !== Kieli.SAAME);
  const [kielioptions2, setKielioptions2] = useState(
    kielioptionsKaikki.filter((kielivalinta) => kielivalinta.value !== Kieli.SUOMI)
  );
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
    if (kieli2 && (kieli2 === Kieli.RUOTSI || kieli2 === Kieli.SAAME)) {
      return true;
    }
    return false;
  };

  return (
    <>
      <h4 className="vayla-small-title">Projektin kuulutusten kielet</h4>
      <FormGroup flexDirection="col" errorMessage={errors?.kielitiedot?.message}>
        <div className="grid grid-cols-1 lg:grid-cols-8 gap-x-6 lg:pr-1 relative">
          <div className="lg:col-span-4">
            <Select
              label="Ensisijainen kieli *"
              options={kielioptions}
              error={errors.kielitiedot?.ensisijainenKieli}
              {...register("kielitiedot.ensisijainenKieli")}
            />
          </div>
          <div className="lg:col-span-4">
            <Select
              label="Toissijainen kieli "
              options={kielioptions2}
              error={errors.kielitiedot?.toissijainenKieli}
              {...register("kielitiedot.toissijainenKieli", {
                setValueAs: (v) => (v ? v : null), // send unselected as null instead of empty string
              })}
            />
          </div>
          {hasVieraskieli() && (
            <div className="lg:col-span-12">
              {`Projektin nimi ${
                vieraskieliEnsisijainen ? lowerCase(vieraskieliEnsisijainen) : lowerCase(kieli2)
              }n kielellä`}
              <TextInput
                label=""
                error={errors.kielitiedot?.projektinNimiVieraskielella}
                {...register("kielitiedot.projektinNimiVieraskielella", { shouldUnregister: true })}
              />
            </div>
          )}
        </div>
      </FormGroup>
    </>
  );
}
