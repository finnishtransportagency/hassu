import Button from "@components/button/Button";
import Select from "@components/form/Select";
import TextInput from "@components/form/TextInput";
import React, { ReactElement } from "react";
import { Controller, FieldError, useFieldArray, useFormContext } from "react-hook-form";
import { formatProperNoun } from "common/util/formatProperNoun";
import useTranslation from "next-translate/useTranslation";
import IconButton from "@components/button/IconButton";
import { IlmoitettavaViranomainen, KuntaVastaanottajaInput, Vuorovaikutus } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import { useProjekti } from "src/hooks/useProjekti";
import { kuntametadata } from "../../../../common/kuntametadata";
import IlmoituksenVastaanottajatLukutila from "../lukutila/komponentit/VuorovaikutusIlmoituksenVastaanottajatLukutila";

interface HelperType {
  kunnat?: FieldError | { nimi?: FieldError | undefined; sahkoposti?: FieldError | undefined }[] | undefined;
  viranomaiset?: FieldError | null | undefined;
}
interface Props {
  kirjaamoOsoitteet: KuntaVastaanottajaInput[] | undefined;
  vuorovaikutus: Vuorovaikutus | undefined;
}

type FormFields = {
  suunnitteluVaihe: {
    vuorovaikutus: {
      ilmoituksenVastaanottajat: {
        kunnat: { nimi: string; sahkoposti: string }[];
        viranomaiset: { nimi: IlmoitettavaViranomainen; sahkoposti: string }[];
      };
    };
  };
};

export default function IlmoituksenVastaanottajat({ kirjaamoOsoitteet, vuorovaikutus }: Props): ReactElement {
  const { t } = useTranslation("commonFI");
  const { data: projekti } = useProjekti();
  const { lang } = useTranslation();

  const julkinen = !!vuorovaikutus?.julkinen;

  const {
    register,
    control,
    formState: { errors },
    setValue,
  } = useFormContext<FormFields>();

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

  if (!kirjaamoOsoitteet) {
    return <></>;
  }

  return (
    <>
      {julkinen && <IlmoituksenVastaanottajatLukutila vuorovaikutus={vuorovaikutus} />}
      <div style={julkinen ? { display: "none" } : {}}>
        <Section>
          <h4 className="vayla-small-title">Ilmoituksen vastaanottajat</h4>
          <SectionContent>
            <p>
              Vuorovaikuttamisesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille. Kunnat on haettu
              Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle viranomaisorganisaatiolle, lisää uusi rivi Lisää uusi
              -painikkeella
            </p>
            <p>Jos kuntatiedoissa on virhe, tee korjaus Projektivelhoon.</p>
          </SectionContent>

          <>
            <SectionContent>
              <h6 className="font-bold">Viranomaiset</h6>
              {(errors.suunnitteluVaihe?.vuorovaikutus?.ilmoituksenVastaanottajat as HelperType)?.viranomaiset && (
                <p className="text-red">
                  {(errors.suunnitteluVaihe?.vuorovaikutus?.ilmoituksenVastaanottajat as HelperType).viranomaiset?.message}
                </p>
              )}
              {viranomaisFields.map((viranomainen, index) => (
                <HassuGrid key={viranomainen.id} cols={{ lg: 3 }}>
                  <Select
                    label="Viranomainen *"
                    options={kirjaamoOsoitteet?.map(({ nimi }) => ({
                      label: nimi ? t(`viranomainen.${nimi}`) : "",
                      value: nimi,
                    }))}
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
                  {!!index && (
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
                  )}
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
                <TextInput label="Kunta *" value={formatProperNoun((kuntametadata.namesForKuntaIds(projekti?.velho?.kunnat, lang) || [])[index] || "")} disabled />
                <TextInput
                  label="Sähköpostiosoite *"
                  error={errors?.suunnitteluVaihe?.vuorovaikutus?.ilmoituksenVastaanottajat?.kunnat?.[index]?.sahkoposti}
                  {...register(`suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.kunnat.${index}.sahkoposti`)}
                />
              </HassuGrid>
            ))}
          </SectionContent>
        </Section>
      </div>
    </>
  );
}
