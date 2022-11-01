import IconButton from "@components/button/IconButton";
import HassuTable from "@components/HassuTable";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import { Aineisto, AineistoInput } from "@services/api";
import React, { useMemo } from "react";
import { FieldArrayWithId, useFieldArray, useFormContext } from "react-hook-form";
import { Column } from "react-table";
import { useHassuTable } from "src/hooks/useHassuTable";
import { useProjekti } from "src/hooks/useProjekti";
import { formatDateTime } from "src/util/dateUtils";

interface FormValues {
  jatkopaatos1: AineistoInput[];
}

type FormAineisto = FieldArrayWithId<FormValues, "jatkopaatos1", "id"> & Pick<Aineisto, "tila" | "tuotu" | "tiedosto">;

export default function AineistoTable() {
  const { data: projekti } = useProjekti();
  const { control, formState, register } = useFormContext<FormValues>();
  const { fields, remove } = useFieldArray({ name: "jatkopaatos1", control });

  const enrichedFields: FormAineisto[] = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = projekti?.jatkoPaatos1Vaihe?.hyvaksymisPaatos || [];
        const { tila, tuotu, tiedosto } = aineistoData.find(({ dokumenttiOid }) => dokumenttiOid === field.dokumenttiOid) || {};

        return { tila, tuotu, tiedosto, ...field };
      }),
    [fields, projekti]
  );

  const columns = useMemo<Column<FormAineisto>[]>(
    () => [
      {
        Header: "Tiedosto",
        width: 250,
        accessor: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          const errorMessage = (formState.errors.jatkopaatos1?.[index] as any | undefined)?.message;
          return (
            <>
              <HassuAineistoNimiExtLink aineistoNimi={aineisto.nimi} tiedostoPolku={aineisto.tiedosto} />
              {errorMessage && <p className="text-red">{errorMessage}</p>}
              <input type="hidden" {...register(`jatkopaatos1.${index}.dokumenttiOid`)} />
              <input type="hidden" {...register(`jatkopaatos1.${index}.nimi`)} />
            </>
          );
        },
      },
      {
        Header: "Tuotu",
        accessor: (aineisto) => (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
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
    [enrichedFields, formState.errors.jatkopaatos1, register, remove]
  );
  const tableProps = useHassuTable<FormAineisto>({
    tableOptions: { columns, data: enrichedFields || [], initialState: { hiddenColumns: ["dokumenttiOid", "id"] } },
  });
  return <HassuTable {...tableProps} />;
}
