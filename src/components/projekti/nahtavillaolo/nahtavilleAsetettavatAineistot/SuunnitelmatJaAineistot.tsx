import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import Select, { SelectOption } from "@components/form/Select";
import HassuAccordion from "@components/HassuAccordion";
import HassuTable from "@components/HassuTable";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import Notification, { NotificationType } from "@components/notification/Notification";
import AineistoNimiExtLink from "@components/projekti/AineistoNimiExtLink";
import AineistojenValitseminenDialog from "@components/projekti/suunnitteluvaihe/AineistojenValitseminenDialog";
import { Aineisto } from "@services/api";
import { AineistoKategoria, aineistoKategoriat } from "common/aineistoKategoriat";
import { find } from "lodash";
import React, { useMemo, useState } from "react";
import { FieldArrayWithId, useFieldArray, useFormContext } from "react-hook-form";
import { Column } from "react-table";
import { useHassuTable } from "src/hooks/useHassuTable";
import { useProjektiRoute } from "src/hooks/useProjektiRoute";
import { formatDateTime } from "src/util/dateUtils";
import { NahtavilleAsetettavatAineistotFormValues } from "./NahtavilleAsetettavatAineistot";

const kategoriaInfoText: Record<string, string> = {
  T1xx: "Selostusosan alle tuodaan A- tai T100 -kansioiden aineistot.",
  T2xx: "Pääpiirustusten alle tuodaan B- tai T200 -kansioiden aineistot.",
  T3xx: "Informatiivisen aineiston alle tuodaan C- tai T300 -kansioiden aineistot.",
};

export default function SuunnitelmatJaAineistot() {
  const { watch } = useFormContext<NahtavilleAsetettavatAineistotFormValues>();
  const aineistoNahtavilla = watch("aineistoNahtavilla");

  return (
    <Section>
      <h4 className="vayla-small-title">Suunnitelmat ja aineistot</h4>
      <p>
        Nähtäville asetettava aineisto sekä lausuntapyyntöön liitettävä aineisto tuodaan Projektivelhosta. Nähtäville
        asetettu aineisto julkaistaan palvelun julkisella puolella kuulutuksen julkaisupäivänä.
      </p>
      <Notification type={NotificationType.INFO_GRAY}>
        Huomioithan, että suunnitelma-aineistojen tulee täyttää saavutettavuusvaatimukset.
      </Notification>
      <HassuAccordion
        items={aineistoKategoriat.listKategoriat().map((paakategoria) => ({
          title: (
            <span className="vayla-small-title">{`${paakategoria.nimi} (${
              aineistoNahtavilla?.[paakategoria.id].length || 0
            })`}</span>
          ),
          content: (
            <SectionContent largeGaps>
              <SuunnitelmaAineistoKategoriaContent paakategoria={paakategoria} />
            </SectionContent>
          ),
        }))}
      />
    </Section>
  );
}

interface SuunnitelmaAineistoKategoriaContentProps {
  paakategoria: AineistoKategoria;
}

const SuunnitelmaAineistoKategoriaContent = (props: SuunnitelmaAineistoKategoriaContentProps) => {
  const { data: projekti } = useProjektiRoute();
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const { setValue, watch } = useFormContext<NahtavilleAsetettavatAineistotFormValues>();

  const aineistoRoute: `aineistoNahtavilla.${string}` = `aineistoNahtavilla.${props.paakategoria.id}`;

  const aineistot = watch(aineistoRoute);

  return (
    <>
      <p>{kategoriaInfoText[props.paakategoria.id]}</p>
      {!!projekti?.oid && !!aineistot?.length && (
        <AineistoTable kategoriaId={props.paakategoria.id} projektiOid={projekti?.oid} />
      )}
      <Button type="button" onClick={() => setAineistoDialogOpen(true)}>
        Tuo Aineistoja
      </Button>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
        onClose={() => setAineistoDialogOpen(false)}
        onSubmit={(newAineistot) => {
          const value = aineistot || [];
          newAineistot.forEach((aineisto) => {
            if (!find(value, { dokumenttiOid: aineisto.dokumenttiOid })) {
              value.push({ ...aineisto, kategoriaId: props.paakategoria.id, jarjestys: value.length });
            }
          });
          setValue(aineistoRoute, value);
        }}
      />
    </>
  );
};

type FormAineisto = FieldArrayWithId<NahtavilleAsetettavatAineistotFormValues, `aineistoNahtavilla.${string}`, "id"> &
  Pick<Aineisto, "tila" | "tuotu">;

interface AineistoTableProps {
  kategoriaId: string;
  projektiOid: string;
}

const AineistoTable = (props: AineistoTableProps) => {
  const { data: projekti } = useProjektiRoute();
  const { control, formState, register, getValues, setValue } =
    useFormContext<NahtavilleAsetettavatAineistotFormValues>();
  const aineistoRoute: `aineistoNahtavilla.${string}` = `aineistoNahtavilla.${props.kategoriaId}`;
  const { fields, remove } = useFieldArray({ name: aineistoRoute, control });

  const enrichedFields: FormAineisto[] = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = projekti?.nahtavillaoloVaihe?.aineistoNahtavilla || [];
        const { tila, tuotu } = aineistoData.find(({ dokumenttiOid }) => dokumenttiOid === field.dokumenttiOid) || {};

        return { tila, tuotu, ...field };
      }),
    [fields, projekti]
  );

  const columns = useMemo<Column<FormAineisto>[]>(
    () => [
      {
        Header: "Aineisto",
        width: 250,
        accessor: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          const errorpath = props.kategoriaId;
          const errorMessage = (formState.errors.aineistoNahtavilla?.[errorpath]?.[index] as any | undefined)?.message;
          return (
            <>
              <AineistoNimiExtLink
                aineistoNimi={aineisto.nimi}
                aineistoOid={aineisto.dokumenttiOid}
                projektiOid={props.projektiOid}
              />
              {errorMessage && <p className="text-red">{errorMessage}</p>}
              <input type="hidden" {...register(`${aineistoRoute}.${index}.dokumenttiOid`)} />
              <input type="hidden" {...register(`${aineistoRoute}.${index}.nimi`)} />
            </>
          );
        },
      },
      {
        Header: "Tuotu",
        accessor: (aineisto) => (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
      },
      {
        Header: "Kategoria",
        accessor: (aineisto) => {
          const options = aineistoKategoriat
            .listKategoriat()
            .reduce<SelectOption[]>((accumulatedOptions, paakategoria) => {
              accumulatedOptions.push({ label: paakategoria.nimi, value: paakategoria.id });
              return accumulatedOptions;
            }, []);
          return (
            <Select
              options={options}
              defaultValue={props.kategoriaId}
              onChange={(event) => {
                const newKategoria = event.target.value;
                if (newKategoria !== props.kategoriaId) {
                  const values = getValues(`aineistoNahtavilla.${newKategoria}`) || [];
                  const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);

                  if (!find(values, { dokumenttiOid: aineisto.dokumenttiOid })) {
                    values.push({ ...aineisto, kategoriaId: newKategoria, jarjestys: values.length });
                    setValue(`aineistoNahtavilla.${newKategoria}`, values);
                  }
                  remove(index);
                }
              }}
            />
          );
        },
      },
      {
        Header: "Poista",
        accessor: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          return (
            <IconButton
              type="button"
              onClick={() => {
                remove(index);
              }}
              icon="trash"
            />
          );
        },
      },
      { Header: "id", accessor: "id" },
      { Header: "dokumenttiOid", accessor: "dokumenttiOid" },
    ],
    [
      aineistoRoute,
      enrichedFields,
      formState.errors.aineistoNahtavilla,
      getValues,
      props.kategoriaId,
      props.projektiOid,
      register,
      remove,
      setValue,
    ]
  );
  const tableProps = useHassuTable<FormAineisto>({
    tableOptions: { columns, data: enrichedFields || [], initialState: { hiddenColumns: ["dokumenttiOid", "id"] } },
  });
  return <HassuTable {...tableProps} />;
};
