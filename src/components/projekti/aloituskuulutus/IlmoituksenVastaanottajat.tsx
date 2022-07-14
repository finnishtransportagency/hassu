import Button from "@components/button/Button";
import Select from "@components/form/Select";
import TextInput from "@components/form/TextInput";
import React, { ReactElement } from "react";
import { Controller, useFieldArray, useFormContext, FieldError } from "react-hook-form";
import { formatProperNoun } from "common/util/formatProperNoun";
import useTranslation from "next-translate/useTranslation";
import IconButton from "@components/button/IconButton";
import { AloitusKuulutusJulkaisu, AloitusKuulutusTila, IlmoitettavaViranomainen } from "@services/api";
import dayjs from "dayjs";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";

interface HelperType {
  kunnat?: FieldError | { nimi?: FieldError | undefined; sahkoposti?: FieldError | undefined }[] | undefined;
  viranomaiset?: FieldError | null | undefined;
}
interface Props {
  isLoading: boolean;
  aloituskuulutusjulkaisu?: AloitusKuulutusJulkaisu | null;
}

type FormFields = {
  aloitusKuulutus: {
    ilmoituksenVastaanottajat: {
      kunnat: { nimi: string; sahkoposti: string }[];
      viranomaiset: { nimi: IlmoitettavaViranomainen; sahkoposti: string }[];
    };
  };
};

export default function IlmoituksenVastaanottajat({ isLoading, aloituskuulutusjulkaisu }: Props): ReactElement {
  const { t } = useTranslation("commonFI");
  const isReadonly = !!aloituskuulutusjulkaisu;
  const isKuntia = !!aloituskuulutusjulkaisu?.ilmoituksenVastaanottajat?.kunnat;
  const isViranomaisia = !!aloituskuulutusjulkaisu?.ilmoituksenVastaanottajat?.viranomaiset;
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();

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
    <Section>
      <SectionContent>
        <h5 className="vayla-small-title">Ilmoituksen vastaanottajat</h5>
        {!isReadonly && (
          <>
            <p>
              Kuulutuksesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille. Kunnat
              on haettu Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle viranomaisorganisaatiolle,
              lisää uusi rivi Lisää uusi -painikkeella.
            </p>
            <p>Jos kuntatiedoissa on virhe, tee korjaus Projektivelhoon.</p>
          </>
        )}

        {aloituskuulutusjulkaisu?.tila === AloitusKuulutusTila.HYVAKSYTTY && (
          <p>
            Ilmoitukset on lähetetty eteenpäin alla oleville viranomaisille ja kunnille. Jos ilmoituksen tila on ‘Ei
            lähetetty’, tarkasta sähköpostiosoite. Ota tarvittaessa yhteys pääkäyttäjään.
          </p>
        )}
      </SectionContent>

      {!isReadonly && kirjaamoOsoitteet && (
        <>
          <SectionContent>
            <h6 className="font-bold">Viranomaiset</h6>
            {(errors.aloitusKuulutus?.ilmoituksenVastaanottajat as HelperType)?.viranomaiset && (
              <p className="text-red">
                {(errors.aloitusKuulutus?.ilmoituksenVastaanottajat as HelperType).viranomaiset?.message}
              </p>
            )}
            {viranomaisFields.map((viranomainen, index) => (
              <HassuGrid key={viranomainen.id} cols={{ lg: 3 }}>
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
                  disabled={isReadonly}
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
                <div className="hidden lg:block" style={{ alignSelf: "flex-end" }}>
                  <IconButton
                    name="viranomainen_trash_button"
                    icon="trash"
                    onClick={(event) => {
                      event.preventDefault();
                      remove(index);
                    }}
                    disabled={isReadonly}
                  />
                </div>
                <div className="block lg:hidden">
                  <Button
                    onClick={(event) => {
                      event.preventDefault();
                      remove(index);
                    }}
                    endIcon="trash"
                    disabled={isReadonly}
                  >
                    Poista
                  </Button>
                </div>
              </HassuGrid>
            ))}
          </SectionContent>
          <Button
            id="add_new_viranomainen"
            type="button"
            onClick={() => {
              // @ts-ignore
              append({ nimi: "", sahkoposti: "" });
            }}
            disabled={isReadonly}
          >
            Lisää uusi +
          </Button>
        </>
      )}
      {isReadonly && (
        <SectionContent>
          <div className="grid grid-cols-4 gap-x-6 mb-4">
            <h6 className="font-bold">Viranomaiset</h6>
            <p></p>
            <p style={{ color: "#7A7A7A" }}>Ilmoituksen tila</p>
            <p style={{ color: "#7A7A7A" }}>Lähetysaika</p>
            {isViranomaisia && (
              <>
                {aloituskuulutusjulkaisu?.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen, index) => (
                  <React.Fragment key={index}>
                    <p className="odd:bg-white even:bg-grey col-span-2">
                      {t(`viranomainen.${viranomainen.nimi}`)}, {viranomainen.sahkoposti}
                    </p>
                    <p className="odd:bg-white even:bg-grey">{viranomainen.lahetetty ? "Lähetetty" : "Ei lähetetty"}</p>
                    <p className="odd:bg-white even:bg-grey">
                      {viranomainen.lahetetty ? dayjs(viranomainen.lahetetty).format("DD.MM.YYYY HH:mm") : null}
                    </p>
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        </SectionContent>
      )}
      <SectionContent>
        <h6 className="font-bold">Kunnat</h6>
        {isLoading ? (
          <p>Ladataan kuntatietoja...</p>
        ) : (
          kuntaFields.length === 0 && <p>Kuntia ei ole asetettu velhoon.</p>
        )}
        {!isReadonly &&
          kuntaFields.map((kunta, index) => (
            <HassuGrid key={kunta.id} cols={{ lg: 3 }}>
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
                disabled={isReadonly}
              />
            </HassuGrid>
          ))}
        {isReadonly && (
          <div className="content grid grid-cols-4 mb-4">
            <p className="vayla-table-header">Kunta</p>
            <p className="vayla-table-header">Sähköpostiosoite</p>
            <p className="vayla-table-header">Ilmoituksen tila</p>
            <p className="vayla-table-header">Lähetysaika</p>
            {isKuntia && (
              <>
                {aloituskuulutusjulkaisu?.ilmoituksenVastaanottajat?.kunnat?.map((kunta, index) => (
                  <React.Fragment key={index}>
                    <p className={getStyleForRow(index)}>{kunta.nimi}</p>
                    <p className={getStyleForRow(index)}>{kunta.sahkoposti}</p>
                    <p className={getStyleForRow(index)}>{kunta.lahetetty ? "Lahetetty" : "Ei lähetetty"}</p>
                    <p className={getStyleForRow(index)}>
                      {kunta.lahetetty ? dayjs(kunta.lahetetty).format("DD.MM.YYYY HH:mm") : null}
                    </p>
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        )}
      </SectionContent>
    </Section>
  );
}
function getStyleForRow(index: number): string | undefined {
  if (index % 2 == 0) {
    return "vayla-table-even";
  }
  return "vayla-table-odd";
}
