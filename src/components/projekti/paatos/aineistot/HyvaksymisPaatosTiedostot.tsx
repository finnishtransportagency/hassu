import IconButton from "@components/button/IconButton";
import HassuTable from "@components/HassuTable";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import { Aineisto, AineistoInput, AineistoTila } from "@services/api";
import React, { useMemo } from "react";
import { FieldArrayWithId, useFieldArray, useFormContext } from "react-hook-form";
import { Column } from "react-table";
import { useHassuTable } from "src/hooks/useHassuTable";
import { useProjekti } from "src/hooks/useProjekti";
import { formatDateTime } from "src/util/dateUtils";
import omit from "lodash/omit";

interface FormValues {
  hyvaksymisPaatos: AineistoInput[];
}

type FormAineisto = FieldArrayWithId<FormValues, "hyvaksymisPaatos", "id"> & Pick<Aineisto, "tila" | "tuotu" | "tiedosto">;

export default function AineistoTable() {
  const { data: projekti } = useProjekti();
  const { control, formState, register } = useFormContext<FormValues>();
  const { fields, update: updateFieldArray } = useFieldArray({ name: "hyvaksymisPaatos", control });

  const enrichedFields: FormAineisto[] = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = projekti?.hyvaksymisPaatosVaihe?.hyvaksymisPaatos || [];
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
          const errorMessage = (formState.errors.hyvaksymisPaatos?.[index] as any | undefined)?.message;
          return (
            aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (
              <>
                <HassuAineistoNimiExtLink aineistoNimi={aineisto.nimi} tiedostoPolku={aineisto.tiedosto} />
                {errorMessage && <p className="text-red">{errorMessage}</p>}
                <input type="hidden" {...register(`hyvaksymisPaatos.${index}.dokumenttiOid`)} />
                <input type="hidden" {...register(`hyvaksymisPaatos.${index}.nimi`)} />
              </>
            )
          );
        },
      },
      {
        Header: "Tuotu",
        accessor: (aineisto) =>
          aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
      },
      {
        Header: "Poista",
        accessor: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          return (
            aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (
              <IconButton
                type="button"
                onClick={() => {
                  const field = omit(fields[index], "id");
                  field.tila = AineistoTila.ODOTTAA_POISTOA;
                  updateFieldArray(index, field);
                }}
                icon="trash"
              />
            )
          );
        },
      },
      { Header: "id", accessor: "id" },
      { Header: "dokumenttiOid", accessor: "dokumenttiOid" },
    ],
    [enrichedFields, formState.errors.hyvaksymisPaatos, register, fields, updateFieldArray]
  );
  const tableProps = useHassuTable<FormAineisto>({
    tableOptions: { columns, data: enrichedFields || [], initialState: { hiddenColumns: ["dokumenttiOid", "id"] } },
  });
  return <HassuTable {...tableProps} />;
}
