import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import React, { ReactElement } from "react";
import { Controller, FieldError, useFieldArray, useFormContext } from "react-hook-form";
import useTranslation from "next-translate/useTranslation";
import IconButton from "@components/button/IconButton";
import { AloitusKuulutusJulkaisu, IlmoitettavaViranomainen, KuulutusJulkaisuTila, KuntaVastaanottaja } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import { kuntametadata } from "hassu-common/kuntametadata";
import { lahetysTila } from "../../../util/aloitusKuulutusUtil";
import HassuTable from "@components/table/HassuTable";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { formatDateTimeIfExistsAndValidOtherwiseDash } from "hassu-common/util/dateUtils";
import HassuMuiSelect from "@components/form/HassuMuiSelect";
import { MenuItem } from "@mui/material";
import { H3, H4 } from "../../Headings";
import { TukiEmailLink } from "../../EiOikeuksia";

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
      kunnat: { id: number; sahkoposti: string }[];
      viranomaiset: { nimi: IlmoitettavaViranomainen; sahkoposti: string }[];
    };
  };
};

export default function IlmoituksenVastaanottajat({ isLoading, aloituskuulutusjulkaisu }: Props): ReactElement {
  const { t, lang } = useTranslation("commonFI");
  const isReadonly = !!aloituskuulutusjulkaisu;
  const isKuntia = !!aloituskuulutusjulkaisu?.ilmoituksenVastaanottajat?.kunnat;
  const isViranomaisia = !!aloituskuulutusjulkaisu?.ilmoituksenVastaanottajat?.viranomaiset;
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();

  const {
    register,
    control,
    formState: { errors },
    setValue,
    trigger,
  } = useFormContext<FormFields>();

  const { fields: kuntaFields } = useFieldArray({
    control,
    name: "aloitusKuulutus.ilmoituksenVastaanottajat.kunnat",
    keyName: "alt-id",
  });

  const {
    fields: viranomaisFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "aloitusKuulutus.ilmoituksenVastaanottajat.viranomaiset",
  });

  return (
    <Section>
      <SectionContent>
        <H3>Ilmoituksen vastaanottajat</H3>
        {!isReadonly && (
          <>
            <p>
              Kuulutuksesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille. Kunnat on haettu
              Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle viranomaisorganisaatiolle, lisää uusi rivi Lisää uusi
              -painikkeella.
            </p>
            <p>
              Jos kuntatiedoissa on virhe, tee korjaus ensin Projektivelhoon. Päivitä sen jälkeen korjattu tieto järjestelmään Projektin
              tiedot -sivulla Päivitä tiedot -painikkeesta. Huomaathan, että tieto ilmoituksesta kulkee ilmoitustaululle automaattisesti.
            </p>
          </>
        )}

        {aloituskuulutusjulkaisu?.tila === KuulutusJulkaisuTila.HYVAKSYTTY && (
          <>
            <p>
              Ilmoitukset on lähetetty eteenpäin alla oleville viranomaisille ja kunnille. Jos ilmoituksen tila on Ei Lähetetty, tarkasta
              sähköpostiosoite. Olethan tässä tapauksessa yhteydessä Väylävirastoon <TukiEmailLink />.
            </p>
            <p>Käythän varmistamassa kuulutuksen alkamisen jälkeen, että ilmoitus on julkaistu myös kuntien omilla sivuilla.</p>
          </>
        )}
      </SectionContent>

      {!isReadonly && kirjaamoOsoitteet && (
        <>
          <SectionContent>
            <H4>Viranomaiset</H4>
            {(errors.aloitusKuulutus?.ilmoituksenVastaanottajat as HelperType)?.viranomaiset && (
              <p className="text-red">{(errors.aloitusKuulutus?.ilmoituksenVastaanottajat as HelperType).viranomaiset?.message}</p>
            )}
            {viranomaisFields.map((viranomainen, index) => (
              <HassuGrid key={viranomainen.id} cols={{ lg: 3 }}>
                <HassuMuiSelect
                  label="Viranomainen *"
                  control={control}
                  defaultValue=""
                  name={`aloitusKuulutus.ilmoituksenVastaanottajat.viranomaiset.${index}.nimi`}
                  onChange={(event) => {
                    const sahkoposti = kirjaamoOsoitteet.find(({ nimi }) => nimi === event.target.value)?.sahkoposti;
                    setValue(`aloitusKuulutus.ilmoituksenVastaanottajat.viranomaiset.${index}.sahkoposti`, sahkoposti || "");
                    trigger("aloitusKuulutus.ilmoituksenVastaanottajat.viranomaiset");
                  }}
                  disabled={isReadonly}
                  error={errors.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset?.[index]?.nimi}
                >
                  {kirjaamoOsoitteet.map(({ nimi }) => {
                    return (
                      <MenuItem key={nimi} value={nimi}>
                        {t(`viranomainen.${nimi}`)}
                      </MenuItem>
                    );
                  })}
                </HassuMuiSelect>
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
                {index !== 0 && (
                  <>
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
                  </>
                )}
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
                    <p className="odd:bg-white even:bg-grey">{lahetysTila(viranomainen)}</p>
                    <p className="odd:bg-white even:bg-grey">{formatDateTimeIfExistsAndValidOtherwiseDash(viranomainen.lahetetty)}</p>
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        </SectionContent>
      )}
      <SectionContent>
        <H4>Kunnat</H4>
        {isLoading ? <p>Ladataan kuntatietoja...</p> : kuntaFields.length === 0 && <p>Kuntia ei ole asetettu Projektivelhoon.</p>}
        {!isReadonly &&
          kuntaFields.map((kunta, index) => {
            return (
              <HassuGrid key={kunta.id} cols={{ lg: 3 }}>
                <input type="hidden" {...register(`aloitusKuulutus.ilmoituksenVastaanottajat.kunnat.${index}.id`)} readOnly />
                <TextInput label="Kunta *" value={kuntametadata.nameForKuntaId(kunta.id, lang)} disabled />
                <TextInput
                  label="Sähköpostiosoite *"
                  error={errors.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat?.[index]?.sahkoposti}
                  {...register(`aloitusKuulutus.ilmoituksenVastaanottajat.kunnat.${index}.sahkoposti`)}
                  disabled={isReadonly}
                />
              </HassuGrid>
            );
          })}
        {isReadonly && (
          <IlmoituksenVastaanottajatTable
            isKuntia={isKuntia}
            kuntaVastaanottajat={aloituskuulutusjulkaisu.ilmoituksenVastaanottajat?.kunnat || []}
          />
        )}
      </SectionContent>
    </Section>
  );
}

const columns: ColumnDef<KuntaVastaanottaja>[] = [
  { accessorFn: (kunta) => kuntametadata.nameForKuntaId(kunta.id, "fi"), id: "kunta", header: "Kunta" },
  { accessorKey: "sahkoposti", id: "sahkoposti", header: "Sähköpostiosoite" },
  {
    accessorFn: (kunta) => lahetysTila(kunta),
    id: "ilmoituksenTila",
    header: "Ilmoituksen tila",
  },
  {
    accessorFn: (kunta) => formatDateTimeIfExistsAndValidOtherwiseDash(kunta.lahetetty),
    id: "lahetysAika",
    header: "Lähetysaika",
  },
];

function IlmoituksenVastaanottajatTable(props: { isKuntia: boolean; kuntaVastaanottajat: KuntaVastaanottaja[] }) {
  const table = useReactTable({
    columns,
    getCoreRowModel: getCoreRowModel(),
    data: props.kuntaVastaanottajat,
    enableSorting: false,
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    state: { pagination: undefined },
  });

  return <HassuTable table={table} />;
}
