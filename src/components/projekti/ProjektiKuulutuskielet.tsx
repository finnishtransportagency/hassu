import React, { ReactElement, useEffect, useState } from "react";
import TextInput from "@components/form/TextInput";
import { useFormContext } from "react-hook-form";
import FormGroup from "@components/form/FormGroup";
import Select from "@components/form/Select";
import { Kieli } from "@services/api";
import { capitalize, lowerCase } from "lodash";

export default function ProjektiKuulutuskielet(): ReactElement {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext(); // retrieve all hook methods

  const kielioptions = [{ label: "Valitse", value: "" }].concat(
    Object.entries(Kieli).map(([k, v]) => ({ label: capitalize(k), value: v }))
  );
  const [kielioptions2, setKielioptions2] = useState(kielioptions);
  const [vieraskieliEnsisijainen, setVieraskieliEnsisijainen] = useState("");
  const kieli1 = watch("kielitiedot.ensisijainenKieli");
  const kieli2 = watch("kielitiedot.toissijainenKieli");
  const vieraskieliKaytossa = vieraskieliEnsisijainen || kieli2;

  useEffect(() => {
    if (kieli1 && kieli1 !== Kieli.SUOMI) {
      setValue("kielitiedot.toissijainenKieli", Kieli.SUOMI);
      setKielioptions2(kielioptions.filter((kielivalinta) => kielivalinta.value === Kieli.SUOMI));
      setVieraskieliEnsisijainen(kieli1);
    } else {
      setKielioptions2(kielioptions);
      setVieraskieliEnsisijainen("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kieli1]);

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
              {...register("kielitiedot.toissijainenKieli")}
            />
          </div>
          {vieraskieliKaytossa && (
            <div className="lg:col-span-12">
              {`Projektin nimi ${
                vieraskieliEnsisijainen ? lowerCase(vieraskieliEnsisijainen) : lowerCase(kieli2)
              }n kielellä`}
              <TextInput
                label=""
                error={errors.kielitiedot?.projektinNimiVieraskielella}
                {...register("kielitiedot.projektinNimiVieraskielella", {shouldUnregister: true})}
              />
            </div>
          )}
        </div>
      </FormGroup>
    </>
  );
}
