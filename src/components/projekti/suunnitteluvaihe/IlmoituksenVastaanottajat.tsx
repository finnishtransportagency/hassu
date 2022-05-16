import Button from "@components/button/Button";
import Select from "@components/form/Select";
import TextInput from "@components/form/TextInput";
import React, { ReactElement } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { formatProperNoun } from "common/util/formatProperNoun";
import useTranslation from "next-translate/useTranslation";
import IconButton from "@components/button/IconButton";
import {
  IlmoitettavaViranomainen,
  KuntaVastaanottajaInput
} from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";

interface Props {
  kirjaamoOsoitteet: KuntaVastaanottajaInput[] | null;
}

type FormFields = {
  suunnitteluVaihe: {
    vuorovaikutus: {
      ilmoituksenVastaanottajat: {
        kunnat: { nimi: string; sahkoposti: string }[];
        viranomaiset: { nimi: IlmoitettavaViranomainen; sahkoposti: string }[];
      };
    }
  };
};

export default function IlmoituksenVastaanottajat({
  kirjaamoOsoitteet,
}: Props): ReactElement {
  const { t } = useTranslation("commonFI");

  const {
    register,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<FormFields>();

  const ilmoituksenVastaanottajat = watch("suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat");

  const { fields: kuntaFields } = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.kunnat",
  });

  const {
    fields: viranomaisFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.viranomaiset",
  });

  const getKuntanimi = (index: number) => {
    const nimi = ilmoituksenVastaanottajat?.kunnat?.[index].nimi;
    if (!nimi) {
      return;
    }

    return formatProperNoun(nimi);
  };

  if (!kirjaamoOsoitteet) {
    return <></>;
  }

  return (
    <Section>
      <h4 className="vayla-small-title">Ilmoituksen vastaanottajat</h4>
      <SectionContent>
        <p>
          Vuorovaikuttamisesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille.
          Kunnat on haettu Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle
          viranomaisorganisaatiolle, lisää uusi rivi Lisää uusi -painikkeella
        </p>
        <p>Jos kuntatiedoissa on virhe, tee korjaus Projektivelhoon.</p>
      </SectionContent>

      <>
        <SectionContent>
          <h6 className="font-bold">Viranomaiset</h6>
          {viranomaisFields.map((viranomainen, index) => (
            <HassuGrid key={viranomainen.id} cols={{ lg: 3 }}>
              <Select
                label="Viranomainen *"
                options={kirjaamoOsoitteet?.map(({ nimi }) => ({ label: nimi ? t(`viranomainen.${nimi}`) : "", value: nimi }))}
                {...register(`suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.viranomaiset.${index}.nimi`, {
                  onChange: (event) => {
                    const sahkoposti = kirjaamoOsoitteet?.find(({ nimi }) => nimi === event.target.value)?.sahkoposti;
                    setValue(
                      `suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.viranomaiset.${index}.sahkoposti`,
                      sahkoposti || ""
                    );
                  },
                })}
                error={errors?.suunnitteluVaihe?.vuorovaikutus?.ilmoituksenVastaanottajat?.viranomaiset?.[index]?.nimi}
                addEmptyOption
              />
              <Controller
                control={control}
                name={`suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.viranomaiset.${index}.sahkoposti`}
                render={({ field }) => (
                  <>
                    <TextInput label="Sähköpostiosoite *" value={field.value} disabled />
                    <input type="hidden" {...field} />
                  </>
                )}
              />
              {!!index &&
                <>
                  <div className="hidden lg:block" style={{ alignSelf: "flex-end" }}>
                    <IconButton
                      icon="trash"
                      onClick={(event) => {
                        event.preventDefault();
                        remove(index);
                      }}
                    />
                  </div>
                  <div className="block lg:hidden">
                    <Button
                      onClick={(event) => {
                        event.preventDefault();
                        remove(index);
                      }}
                      endIcon="trash"
                    >
                      Poista
                    </Button>
                  </div>
                </>
              }
            </HassuGrid>
          ))}
        </SectionContent>
        <Button
          type="button"
          onClick={() => {
            // @ts-ignore
            append({ nimi: "", sahkoposti: "" });
          }}
        >
          Lisää uusi +
        </Button>
      </>
      <SectionContent>
        <h6 className="font-bold">Kunnat</h6>

        {kuntaFields.map((kunta, index) => (
          <HassuGrid key={kunta.id} cols={{ lg: 3 }}>
            <input
              type="hidden"
              {...register(`suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.kunnat.${index}.nimi`)}
              readOnly
            />
            <TextInput label="Kunta *" value={getKuntanimi(index)} disabled />
            <TextInput
              label="Sähköpostiosoite *"
              error={errors?.suunnitteluVaihe?.vuorovaikutus?.ilmoituksenVastaanottajat?.kunnat?.[index]?.sahkoposti}
              {...register(`suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.kunnat.${index}.sahkoposti`)}
            />
          </HassuGrid>
        ))}
      </SectionContent>
    </Section>
  );
}
