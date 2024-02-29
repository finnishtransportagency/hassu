import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import React, { Fragment, ReactElement } from "react";
import { Controller, FieldError, useFieldArray, useFormContext } from "react-hook-form";
import useTranslation from "next-translate/useTranslation";
import IconButton from "@components/button/IconButton";
import { KuntaVastaanottajaInput, NahtavillaoloVaihe, ViranomaisVastaanottajaInput } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import dayjs from "dayjs";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import { kuntametadata } from "hassu-common/kuntametadata";
import { lahetysTila } from "../../../../util/aloitusKuulutusUtil";
import HassuMuiSelect from "@components/form/HassuMuiSelect";
import { MenuItem } from "@mui/material";
import KiinteistonomistajatOhje from "@components/projekti/common/KiinteistonOmistajatOhje";

interface HelperType {
  kunnat?: FieldError | { nimi?: FieldError | undefined; sahkoposti?: FieldError | undefined }[] | undefined;
  viranomaiset?: FieldError | null | undefined;
}

interface Props {
  nahtavillaoloVaihe: NahtavillaoloVaihe | null | undefined;
}

type FormFields = {
  nahtavillaoloVaihe: {
    ilmoituksenVastaanottajat: {
      kunnat: Array<KuntaVastaanottajaInput>;
      viranomaiset: Array<ViranomaisVastaanottajaInput>;
    };
  };
};

export default function IlmoituksenVastaanottajat({ nahtavillaoloVaihe }: Props): ReactElement {
  const { t, lang } = useTranslation("commonFI");
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();

  const julkinen = false; //nahtavillaoloVaihe?.tila === KuulutusJulkaisuTila.HYVAKSYTTY;

  const {
    register,
    control,
    formState: { errors },
    setValue,
  } = useFormContext<FormFields>();

  const { fields: kuntaFields } = useFieldArray({
    control,
    name: "nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat",
    keyName: "alt-id",
  });

  const {
    fields: viranomaisFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "nahtavillaoloVaihe.ilmoituksenVastaanottajat.viranomaiset",
  });

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
              Kuulutuksesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille. Kunnat on haettu
              Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle viranomaisorganisaatiolle, lisää uusi rivi Lisää uusi
              -painikkeella.
            </p>
            <p>
              Jos kuntatiedoissa on virhe, tee korjaus ensin Projektivelhoon. Päivitä sen jälkeen korjattu tieto järjestelmään Projektin
              tiedot -sivulla Päivitä tiedot -painikkeesta. Huomaathan, että tieto ilmoituksesta kulkee ilmoitustaululle automaattisesti.
            </p>
          </SectionContent>
          <SectionContent>
            <div className="grid grid-cols-4 gap-x-6 mb-4">
              <h6 className="font-bold">Viranomaiset</h6>
              <p></p>
              <p style={{ color: "#7A7A7A" }}>Ilmoituksen tila</p>
              <p style={{ color: "#7A7A7A" }}>Lähetysaika</p>

              {nahtavillaoloVaihe?.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen, index) => (
                <React.Fragment key={index}>
                  <p className="odd:bg-white even:bg-grey col-span-2">
                    {t(`viranomainen.${viranomainen.nimi}`)}, {viranomainen.sahkoposti}
                  </p>
                  <p className="odd:bg-white even:bg-grey">{lahetysTila(viranomainen)}</p>
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
              {nahtavillaoloVaihe?.ilmoituksenVastaanottajat?.kunnat?.map((kunta, index) => (
                <Fragment key={index}>
                  <p className={getStyleForRow(index)}>{kuntametadata.nameForKuntaId(kunta.id, lang)}</p>
                  <p className={getStyleForRow(index)}>{kunta.sahkoposti}</p>
                  <p className={getStyleForRow(index)}>{lahetysTila(kunta)}</p>
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
              Jos kuntatiedoissa on virhe, tee korjaus ensin Projektivelhoon. Päivitä sen jälkeen korjattu tieto järjestelmään Projektin
              tiedot -sivulla Päivitä tiedot -painikkeesta. Huomaathan, että tieto ilmoituksesta kulkee ilmoitustaululle automaattisesti.
            </p>
          </SectionContent>

          <>
            <SectionContent>
              <h6 className="font-bold">Viranomaiset</h6>
              {(errors.nahtavillaoloVaihe?.ilmoituksenVastaanottajat as HelperType)?.viranomaiset && (
                <p className="text-red">{(errors.nahtavillaoloVaihe?.ilmoituksenVastaanottajat as HelperType).viranomaiset?.message}</p>
              )}
              {viranomaisFields.map((viranomainen, index) => (
                <HassuGrid key={viranomainen.id} cols={{ lg: 3 }}>
                  <HassuMuiSelect
                    label="Viranomainen *"
                    control={control}
                    defaultValue=""
                    name={`nahtavillaoloVaihe.ilmoituksenVastaanottajat.viranomaiset.${index}.nimi`}
                    onChange={(event) => {
                      const sahkoposti = kirjaamoOsoitteet?.find(({ nimi }) => nimi === event.target.value)?.sahkoposti;
                      setValue(`nahtavillaoloVaihe.ilmoituksenVastaanottajat.viranomaiset.${index}.sahkoposti`, sahkoposti || "");
                    }}
                    error={errors?.nahtavillaoloVaihe?.ilmoituksenVastaanottajat?.viranomaiset?.[index]?.nimi}
                  >
                    {kirjaamoOsoitteet.map(({ nimi }) => (
                      <MenuItem key={nimi} value={nimi}>
                        {t(`viranomainen.${nimi}`)}
                      </MenuItem>
                    ))}
                  </HassuMuiSelect>
                  <Controller
                    control={control}
                    name={`nahtavillaoloVaihe.ilmoituksenVastaanottajat.viranomaiset.${index}.sahkoposti`}
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
            {kuntaFields.length === 0 && <p>Kuntia ei ole asetettu velhoon.</p>}
            {kuntaFields.map((kunta, index) => (
              <HassuGrid key={kunta.id} cols={{ lg: 3 }}>
                <input type="hidden" {...register(`nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat.${index}.id`)} readOnly />
                <TextInput label="Kunta *" value={kuntametadata.nameForKuntaId(kunta.id, lang)} disabled />
                <TextInput
                  label="Sähköpostiosoite *"
                  error={errors?.nahtavillaoloVaihe?.ilmoituksenVastaanottajat?.kunnat?.[index]?.sahkoposti}
                  {...register(`nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat.${index}.sahkoposti`)}
                />
              </HassuGrid>
            ))}
          </SectionContent>
          <KiinteistonomistajatOhje />
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
