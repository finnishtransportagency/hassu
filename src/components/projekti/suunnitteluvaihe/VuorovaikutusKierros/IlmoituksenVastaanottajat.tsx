import Button from "@components/button/Button";
import Select from "@components/form/Select";
import TextInput from "@components/form/TextInput";
import React, { ReactElement } from "react";
import { Controller, FieldError, useFieldArray, useFormContext } from "react-hook-form";
import useTranslation from "next-translate/useTranslation";
import IconButton from "@components/button/IconButton";
import { IlmoitettavaViranomainen, KirjaamoOsoite, VuorovaikutusKierros } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import { kuntametadata } from "../../../../../common/kuntametadata";

interface HelperType {
  kunnat?: FieldError | { nimi?: FieldError | undefined; sahkoposti?: FieldError | undefined }[] | undefined;
  viranomaiset?: FieldError | null | undefined;
}

interface Props {
  kirjaamoOsoitteet: KirjaamoOsoite[] | undefined;
  vuorovaikutus: VuorovaikutusKierros | undefined;
}

type FormFields = {
  vuorovaikutusKierros: {
    ilmoituksenVastaanottajat: {
      kunnat: { id: number; sahkoposti: string }[];
      viranomaiset: { nimi: IlmoitettavaViranomainen; sahkoposti: string }[];
    };
  };
};

export default function IlmoituksenVastaanottajat({ kirjaamoOsoitteet }: Props): ReactElement {
  const { t } = useTranslation("commonFI");
  const { lang } = useTranslation();

  const {
    register,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<FormFields>();

  const { fields: kuntaFields } = useFieldArray({
    control,
    name: "vuorovaikutusKierros.ilmoituksenVastaanottajat.kunnat",
    keyName: "alt-id",
  });

  const {
    fields: viranomaisFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "vuorovaikutusKierros.ilmoituksenVastaanottajat.viranomaiset",
  });

  if (!kirjaamoOsoitteet) {
    return <></>;
  }

  return (
    <>
      <div>
        <Section>
          <h4 className="vayla-small-title">Kutsun ilmoituksen vastaanottajat</h4>
          <SectionContent>
            <p>
              Vuorovaikuttamisesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille. Kunnat on haettu
              Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle viranomaisorganisaatiolle, lisää uusi rivi Lisää uusi
              -painikkeella.
            </p>
            <p>
              Jos kuntatiedoissa on virhe, tee korjaus ensin Projektivelhoon. Päivitä sen jälkeen korjattu tieto järjestelmään Projektin
              tiedot -sivulla Tuo tiedot -painikkeesta. Huomaathan, että tieto ilmoituksesta kulkee ilmoitustaululle automaattisesti.
            </p>
          </SectionContent>

          <>
            <SectionContent>
              <h6 className="font-bold">Viranomaiset</h6>
              {(errors.vuorovaikutusKierros?.ilmoituksenVastaanottajat as HelperType)?.viranomaiset && (
                <p className="text-red">{(errors.vuorovaikutusKierros?.ilmoituksenVastaanottajat as HelperType).viranomaiset?.message}</p>
              )}
              {viranomaisFields.map((viranomainen, index) => (
                <HassuGrid key={viranomainen.id} cols={{ lg: 3 }}>
                  <Select
                    label="Viranomainen *"
                    options={kirjaamoOsoitteet?.map(({ nimi }) => ({
                      label: nimi ? t(`viranomainen.${nimi}`) : "",
                      value: nimi,
                    }))}
                    {...register(`vuorovaikutusKierros.ilmoituksenVastaanottajat.viranomaiset.${index}.nimi`, {
                      onChange: (event) => {
                        const sahkoposti = kirjaamoOsoitteet?.find(({ nimi }) => nimi === event.target.value)?.sahkoposti;
                        setValue(`vuorovaikutusKierros.ilmoituksenVastaanottajat.viranomaiset.${index}.sahkoposti`, sahkoposti || "");
                      },
                    })}
                    error={errors?.vuorovaikutusKierros?.ilmoituksenVastaanottajat?.viranomaiset?.[index]?.nimi}
                    addEmptyOption
                  />
                  <Controller
                    control={control}
                    name={`vuorovaikutusKierros.ilmoituksenVastaanottajat.viranomaiset.${index}.sahkoposti`}
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
                <input type="hidden" {...register(`vuorovaikutusKierros.ilmoituksenVastaanottajat.kunnat.${index}.id`)} readOnly />
                <TextInput label="Kunta *" value={kuntametadata.nameForKuntaId(kunta.id, lang)} disabled />
                <TextInput
                  label="Sähköpostiosoite *"
                  error={errors?.vuorovaikutusKierros?.ilmoituksenVastaanottajat?.kunnat?.[index]?.sahkoposti}
                  {...register(`vuorovaikutusKierros.ilmoituksenVastaanottajat.kunnat.${index}.sahkoposti`)}
                />
              </HassuGrid>
            ))}
          </SectionContent>
        </Section>
      </div>
    </>
  );
}
