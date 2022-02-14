import Button from "@components/button/Button";
import Select from "@components/form/Select";
import TextInput from "@components/form/TextInput";
import React, { ReactElement, useState } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { formatProperNoun } from "common/util/formatProperNoun";
import { useEffect } from "react";
import log from "loglevel";
import useTranslation from "next-translate/useTranslation";
import IconButton from "@components/button/IconButton";
import { IlmoitettavaViranomainen } from "@services/api";

interface Props {
  isLoading: boolean;
}

interface KirjaamoOsoite {
  nimi: string;
  sahkoposti: string;
}

type FormFields = {
  aloitusKuulutus: {
    ilmoituksenVastaanottajat: {
      kunnat: { nimi: string; sahkoposti: string }[];
      viranomaiset: { nimi: IlmoitettavaViranomainen; sahkoposti: string }[];
    };
  };
};

export default function IlmoituksenVastaanottajat({ isLoading }: Props): ReactElement {
  const { t } = useTranslation("commonFI");
  const kirjaamoOsoitteetEnv = process.env.NEXT_PUBLIC_KIRJAAMO_OSOITTEET;
  const [kirjaamoOsoitteet, setKirjaamoOsoitteet] = useState<KirjaamoOsoite[]>([]);

  useEffect(() => {
    if (kirjaamoOsoitteetEnv) {
      try {
        setKirjaamoOsoitteet(JSON.parse(kirjaamoOsoitteetEnv));
      } catch {
        log.log(`Failed to parse NEXT_PUBLIC_KIRJAAMO_OSOITTEET: '${kirjaamoOsoitteetEnv}'`);
      }
    }
  }, [kirjaamoOsoitteetEnv]);

  const {
    register,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<FormFields>();

  const ilmoituksenVastaanottajat = watch("aloitusKuulutus.ilmoituksenVastaanottajat");

  const { fields: kuntaFields } = useFieldArray({
    control,
    name: "aloitusKuulutus.ilmoituksenVastaanottajat.kunnat",
  });

  const {
    fields: viranomaisFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "aloitusKuulutus.ilmoituksenVastaanottajat.viranomaiset",
  });

  const getKuntanimi = (index: number) => {
    const nimi = ilmoituksenVastaanottajat?.kunnat?.[index].nimi;
    if (!nimi) {
      return;
    }

    return formatProperNoun(nimi);
  };

  return (
    <>
      <h5 className="vayla-small-title">Ilmoituksen vastaanottajat</h5>
      <p>
        Kuulutuksesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille. Kunnat on
        haettu Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle viranomaisorganisaatiolle, lisää
        uusi rivi Lisää uusi -painikkeella.
      </p>
      <p>Jos kuntatiedoissa on virhe, tee korjaus Projektivelhoon.</p>
      <h6 className="font-bold">Viranomaiset</h6>
      {viranomaisFields.map((viranomainen, index) => (
        <div key={viranomainen.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
          <Select
            label="Viranomainen *"
            options={kirjaamoOsoitteet.map(({ nimi }) => ({ label: t(`viranomainen.${nimi}`), value: nimi }))}
            {...register(`aloitusKuulutus.ilmoituksenVastaanottajat.viranomaiset.${index}.nimi`, {
              onChange: (event) => {
                const sahkoposti = kirjaamoOsoitteet.find(({ nimi }) => nimi === event.target.value)?.sahkoposti;
                setValue(
                  `aloitusKuulutus.ilmoituksenVastaanottajat.viranomaiset.${index}.sahkoposti`,
                  sahkoposti || ""
                );
              },
            })}
            error={errors.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset?.[index]?.nimi}
            addEmptyOption
          />
          <Controller
            control={control}
            name={`aloitusKuulutus.ilmoituksenVastaanottajat.viranomaiset.${index}.sahkoposti`}
            render={({ field }) => (
              <>
                <TextInput label="Sähköpostiosoite *" value={field.value} disabled />
                <input type="hidden" {...field} />
              </>
            )}
          />
          <div>
            <div className="hidden lg:block lg:mt-6">
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
          </div>
        </div>
      ))}
      <Button
        className="mb-7"
        type="button"
        onClick={() => {
          // @ts-ignore
          append({ nimi: "", sahkoposti: "" });
        }}
      >
        Lisää uusi +
      </Button>
      <h6 className="font-bold">Kunnat</h6>
      {isLoading ? <p>Ladataan kuntatietoja...</p> : kuntaFields.length === 0 && <p>Kuntia ei ole asetettu velhoon.</p>}
      {kuntaFields.map((kunta, index) => (
        <div key={kunta.id} className="grid grid-cols-3 gap-x-6 mb-4">
          <input
            type="hidden"
            {...register(`aloitusKuulutus.ilmoituksenVastaanottajat.kunnat.${index}.nimi`)}
            readOnly
          />
          <TextInput label="Kunta *" value={getKuntanimi(index)} disabled />
          <TextInput
            label="Sähköpostiosoite *"
            error={errors.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat?.[index]?.sahkoposti}
            {...register(`aloitusKuulutus.ilmoituksenVastaanottajat.kunnat.${index}.sahkoposti`)}
          />
        </div>
      ))}
    </>
  );
}
