import Button from "@components/button/Button";
import Select from "@components/form/Select";
import TextInput from "@components/form/TextInput";
import React, { Fragment, ReactElement } from "react";
import { Controller, FieldError, useFieldArray, useFormContext } from "react-hook-form";
import { formatProperNoun } from "common/util/formatProperNoun";
import useTranslation from "next-translate/useTranslation";
import IconButton from "@components/button/IconButton";
import { KuntaVastaanottajaInput, HyvaksymisPaatosVaihe, ViranomaisVastaanottajaInput, Projekti, Kieli } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import dayjs from "dayjs";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import { Link } from "@mui/material";
import { kuntametadata } from "common/kuntametadata";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";

interface HelperType {
  kunnat?: FieldError | { nimi?: FieldError | undefined; sahkoposti?: FieldError | undefined }[] | undefined;
  viranomaiset?: FieldError | null | undefined;
}

interface Props {
  jatkoPaatos1Vaihe?: HyvaksymisPaatosVaihe | null | undefined;
  projekti: Projekti | null | undefined;
}

type FormFields = {
  jatkoPaatos1Vaihe: {
    ilmoituksenVastaanottajat: {
      kunnat: Array<KuntaVastaanottajaInput>;
      viranomaiset: Array<ViranomaisVastaanottajaInput>;
    };
  };
};

export default function IlmoituksenVastaanottajat({ projekti }: Props): ReactElement {
  const { t } = useTranslation("commonFI");
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();

  const julkinen = false; //TODO

  const {
    register,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<FormFields>();

  const kieli = useKansalaiskieli();

  const ilmoituksenVastaanottajat = watch("jatkoPaatos1Vaihe.ilmoituksenVastaanottajat");

  const { fields: kuntaFields } = useFieldArray({
    control,
    name: "jatkoPaatos1Vaihe.ilmoituksenVastaanottajat.kunnat",
  });

  const {
    fields: viranomaisFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "jatkoPaatos1Vaihe.ilmoituksenVastaanottajat.viranomaiset",
  });

  const getKuntanimi = (index: number, lang: Kieli) => {
    const nimi = kuntametadata.nameForKuntaId(ilmoituksenVastaanottajat?.kunnat?.[index].id, lang);
    if (!nimi) {
      return;
    }

    return formatProperNoun(nimi);
  };

  if (!projekti) {
    return <></>;
  }
  if (!kirjaamoOsoitteet) {
    return <></>;
  }

  return (
    <>
      {julkinen && (
        <Section>
          <h4 className="vayla-small-title">Ilmoituksen vastaanottajat</h4>
          <SectionContent>
            <p>
              Ilmoitukset on lähetetty eteenpäin alla oleville viranomaisille ja kunnille. Jos ilmoituksen tila on ‘Ei lähetetty’, tarkasta
              sähköpostiosoite. Ota tarvittaessa yhteys pääkäyttäjään.
            </p>
          </SectionContent>
          <SectionContent>
            <div className="grid grid-cols-4 gap-x-6 mb-4">
              <h6 className="font-bold">Viranomaiset</h6>
              <p></p>
              <p style={{ color: "#7A7A7A" }}>Ilmoituksen tila</p>
              <p style={{ color: "#7A7A7A" }}>Lähetysaika</p>

              {projekti.jatkoPaatos1Vaihe?.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen, index) => (
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
            </div>
          </SectionContent>
          <SectionContent>
            <h6 className="font-bold">Kunnat</h6>
            <div className="content grid grid-cols-4 mb-4">
              <p className="vayla-table-header">Kunta</p>
              <p className="vayla-table-header">Sähköpostiosoite</p>
              <p className="vayla-table-header">Ilmoituksen tila</p>
              <p className="vayla-table-header">Lähetysaika</p>
              {projekti.jatkoPaatos1Vaihe?.ilmoituksenVastaanottajat?.kunnat?.map((kunta, index) => (
                <Fragment key={index}>
                  <p className={getStyleForRow(index)}>{kuntametadata.nameForKuntaId(kunta.id, kieli)}</p>
                  <p className={getStyleForRow(index)}>{kunta.sahkoposti}</p>
                  <p className={getStyleForRow(index)}>{kunta.lahetetty ? "Lahetetty" : "Ei lähetetty"}</p>
                  <p className={getStyleForRow(index)}>{kunta.lahetetty ? dayjs(kunta.lahetetty).format("DD.MM.YYYY HH:mm") : null}</p>
                </Fragment>
              ))}
            </div>
          </SectionContent>
        </Section>
      )}
      <div style={julkinen ? { display: "none" } : {}}>
        <Section>
          <h4 className="vayla-small-title">Ilmoituksen vastaanottajat</h4>
          <SectionContent>
            <p>
              Kuulutuksesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille. Kunnat on haettu
              Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle viranomaisorganisaatiolle, lisää uusi rivi Lisää uusi
              -painikkeella.
            </p>
            <p>
              Jos kuntatiedoissa on virhe tai kuntia puuttuu, tee korjaus Projektivelhoon ja päivitä järjesteltämästä{" "}
              <Link underline="none" href={`/yllapito/projekti/${projekti.oid}`}>
                Projektin tiedot
              </Link>{" "}
              -sivu.
            </p>
          </SectionContent>

          <>
            <SectionContent>
              <h6 className="font-bold">Viranomaiset</h6>
              {(errors.jatkoPaatos1Vaihe?.ilmoituksenVastaanottajat as HelperType)?.viranomaiset && (
                <p className="text-red">{(errors.jatkoPaatos1Vaihe?.ilmoituksenVastaanottajat as HelperType).viranomaiset?.message}</p>
              )}
              {viranomaisFields.map((viranomainen, index) => (
                <HassuGrid key={viranomainen.id} cols={{ lg: 3 }}>
                  <Select
                    label="Viranomainen *"
                    options={kirjaamoOsoitteet?.map(({ nimi }) => ({
                      label: nimi ? t(`viranomainen.${nimi}`) : "",
                      value: nimi,
                    }))}
                    {...register(`jatkoPaatos1Vaihe.ilmoituksenVastaanottajat.viranomaiset.${index}.nimi`, {
                      onChange: (event) => {
                        const sahkoposti = kirjaamoOsoitteet?.find(({ nimi }) => nimi === event.target.value)?.sahkoposti;
                        setValue(`jatkoPaatos1Vaihe.ilmoituksenVastaanottajat.viranomaiset.${index}.sahkoposti`, sahkoposti || "");
                      },
                    })}
                    error={errors?.jatkoPaatos1Vaihe?.ilmoituksenVastaanottajat?.viranomaiset?.[index]?.nimi}
                    addEmptyOption
                  />
                  <Controller
                    control={control}
                    name={`jatkoPaatos1Vaihe.ilmoituksenVastaanottajat.viranomaiset.${index}.sahkoposti`}
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
                <input type="hidden" {...register(`jatkoPaatos1Vaihe.ilmoituksenVastaanottajat.kunnat.${index}.id`)} readOnly />
                <TextInput label="Kunta *" value={getKuntanimi(index, kieli)} disabled />
                <TextInput
                  label="Sähköpostiosoite *"
                  error={errors?.jatkoPaatos1Vaihe?.ilmoituksenVastaanottajat?.kunnat?.[index]?.sahkoposti}
                  {...register(`jatkoPaatos1Vaihe.ilmoituksenVastaanottajat.kunnat.${index}.sahkoposti`)}
                />
              </HassuGrid>
            ))}
          </SectionContent>
        </Section>
      </div>
    </>
  );
}

function getStyleForRow(index: number): string | undefined {
  if (index % 2 == 0) {
    return "vayla-table-even";
  }
  return "vayla-table-odd";
}
