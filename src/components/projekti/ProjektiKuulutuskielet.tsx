import React, { ReactElement, useEffect, useMemo, useState } from "react";
import TextInput from "@components/form/TextInput";
import { useFormContext } from "react-hook-form";
import { Kieli } from "@services/api";
import lowerCase from "lodash/lowerCase";
import HassuGrid from "@components/HassuGrid";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { isAllowedToChangeKielivalinta } from "hassu-common/util/operationValidators";
import HassuMuiSelect from "@components/form/HassuMuiSelect";
import { MenuItem } from "@mui/material";
import { H3 } from "../Headings";
import { FormValues } from "@pages/yllapito/projekti/[oid]";

const kielioptionsKaikki = Object.entries(Kieli).map(([k, v]) => ({ label: lowerCase(k), value: v }));
const kielioptions = kielioptionsKaikki.filter((kielivalinta) => kielivalinta.value !== Kieli.POHJOISSAAME);

export default function ProjektiKuulutuskielet({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
    control,
  } = useFormContext<FormValues>();

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

  const hasVieraskieli = useMemo(
    () => [kieli1, kieli2].some((kieli) => kieli === Kieli.POHJOISSAAME || kieli === Kieli.RUOTSI),
    [kieli1, kieli2]
  );

  const kielivalintaaEiSaaMuuttaa = !isAllowedToChangeKielivalinta(projekti);

  return (
    <Section>
      <SectionContent>
        <H3>Projektin kuulutusten kielet</H3>
        <p>Valitse projektin ensisijaisesti käytettävä kieli (alueen enemmistön kieli) sekä mahdollinen toissijainen kieli.</p>
        <HassuGrid cols={{ lg: 3 }}>
          <HassuMuiSelect
            label="Ensisijainen kieli *"
            control={control}
            defaultValue=""
            name="kielitiedot.ensisijainenKieli"
            disabled={kielivalintaaEiSaaMuuttaa}
            error={errors.kielitiedot?.ensisijainenKieli}
          >
            {kielioptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </HassuMuiSelect>
          <HassuMuiSelect
            label="Toissijainen kieli "
            control={control}
            name="kielitiedot.toissijainenKieli"
            defaultValue=""
            disabled={kielivalintaaEiSaaMuuttaa}
            error={errors.kielitiedot?.toissijainenKieli}
          >
            {kielioptions2.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </HassuMuiSelect>
        </HassuGrid>
      </SectionContent>
      {hasVieraskieli && (
        <TextInput
          label={`Projektin nimi ${vieraskieliEnsisijainen ? lowerCase(vieraskieliEnsisijainen) : lowerCase(kieli2!)}ksi *`}
          error={errors.kielitiedot?.projektinNimiVieraskielella}
          {...register("kielitiedot.projektinNimiVieraskielella", { shouldUnregister: true })}
        />
      )}
      <p>
        Huomaa, että valinta vaikuttaa siihen, mitä kenttiä järjestelmässä näytetään kuulutusten yhteydessä. Jos valitset suunnitelmalle
        toisen kielen, muistathan käydä lisäämässä muunkieliset vastineet tittelitiedoille Projektin henkilöt -sivulta. Kielivalintaan voi
        vaikuttaa aloituskuulutuksen tekemiseen saakka, jonka jälkeen valinta lukittuu.
      </p>
    </Section>
  );
}
