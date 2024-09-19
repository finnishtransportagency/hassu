import IconButton from "@components/button/IconButton";
import HassuTable from "@components/table/HassuTable";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import { Aineisto, AineistoInput, AineistoTila, HyvaksymisPaatosVaihe } from "@services/api";
import React, { ComponentProps, useCallback, useMemo } from "react";
import { FieldArrayWithId, useFieldArray, UseFieldArrayAppend, UseFieldArrayRemove, useFormContext } from "react-hook-form";
import { formatDateTime } from "hassu-common/util/dateUtils";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { experimental_sx as sx, MUIStyledCommonProps, styled } from "@mui/system";
import useTableDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import { useIsTouchScreen } from "src/hooks/useIsTouchScreen";

interface FormValues {
  hyvaksymisPaatos: AineistoInput[];
  poistetutHyvaksymisPaatos: AineistoInput[];
}

type FormAineisto = FieldArrayWithId<FormValues, "hyvaksymisPaatos", "id"> & Pick<Aineisto, "tila" | "tuotu" | "tiedosto">;

export default function AineistoTable({ vaihe }: { vaihe: HyvaksymisPaatosVaihe | null | undefined }) {
  const { control, formState, register, setValue } = useFormContext<FormValues>();
  const { fields, move, remove } = useFieldArray({ name: "hyvaksymisPaatos", control });
  const { append: appendToPoistetut } = useFieldArray({ name: "poistetutHyvaksymisPaatos", control });

  const enrichedFields: FormAineisto[] = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = vaihe?.hyvaksymisPaatos || [];
        const { tila, tuotu, tiedosto } = aineistoData.find(({ uuid }) => uuid === field.uuid) || {};

        return { ...field, tila: tila ?? AineistoTila.ODOTTAA_TUONTIA, tuotu, tiedosto };
      }),
    [fields, vaihe?.hyvaksymisPaatos]
  );

  const columns = useMemo<ColumnDef<FormAineisto>[]>(
    () => [
      {
        header: "Aineisto",
        meta: { minWidth: 250, widthFractions: 6 },
        accessorFn: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.uuid === aineisto.uuid);
          const errorMessage = (formState.errors.hyvaksymisPaatos?.[index] as any | undefined)?.message;
          return (
            <>
              <HassuAineistoNimiExtLink aineistoNimi={aineisto.nimi} tiedostoPolku={aineisto.tiedosto} aineistoTila={aineisto.tila} />
              {errorMessage && <p className="text-red">{errorMessage}</p>}
              <input type="hidden" {...register(`hyvaksymisPaatos.${index}.dokumenttiOid`)} />
              <input type="hidden" {...register(`hyvaksymisPaatos.${index}.nimi`)} />
            </>
          );
        },
      },
      {
        header: "Tuotu",
        accessorFn: (aineisto) => (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
        meta: { minWidth: 120, widthFractions: 2 },
      },
      {
        header: "",
        id: "actions",
        meta: { minWidth: 120, widthFractions: 2 },
        accessorFn: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.uuid === aineisto.uuid);
          return <ActionsColumn index={index} remove={remove} aineisto={aineisto} appendToPoistetut={appendToPoistetut} />;
        },
      },
    ],
    [enrichedFields, formState.errors.hyvaksymisPaatos, register, remove, appendToPoistetut]
  );

  const findRowIndex = useCallback(
    (id: string) => {
      return enrichedFields.findIndex((row) => row.id.toString() === id);
    },
    [enrichedFields]
  );

  const onDragAndDrop = useCallback(
    (id: string, targetRowIndex: number) => {
      const index = findRowIndex(id);
      setValue(`hyvaksymisPaatos.${index}.jarjestys`, targetRowIndex);
      setValue(`hyvaksymisPaatos.${targetRowIndex}.jarjestys`, index);
      move(index, targetRowIndex);
    },
    [findRowIndex, move, setValue]
  );

  const tableProps = useReactTable<FormAineisto>({
    columns,
    data: enrichedFields || [],
    getCoreRowModel: getCoreRowModel(),
    state: {
      pagination: undefined,
    },
    getRowId: (row) => row.id,
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    meta: { findRowIndex, onDragAndDrop },
  });
  return <HassuTable table={tableProps} />;
}

type ActionColumnProps = {
  aineisto: FormAineisto;
  appendToPoistetut: UseFieldArrayAppend<FormValues, "poistetutHyvaksymisPaatos">;
  index: number;
  remove: UseFieldArrayRemove;
} & MUIStyledCommonProps &
  ComponentProps<"div">;

const ActionsColumn = styled(({ index, remove, aineisto, appendToPoistetut, ...props }: ActionColumnProps) => {
  const dragRef = useTableDragConnectSourceContext();
  const isTouch = useIsTouchScreen();
  return (
    <div {...props}>
      <IconButton
        type="button"
        onClick={() => {
          remove(index);
          if (aineisto.tila) {
            appendToPoistetut({
              dokumenttiOid: aineisto.dokumenttiOid,
              tila: AineistoTila.ODOTTAA_POISTOA,
              nimi: aineisto.nimi,
              uuid: aineisto.uuid,
            });
          }
        }}
        icon="trash"
      />
      {!isTouch && <IconButton type="button" icon="equals" ref={dragRef} />}
    </div>
  );
})(sx({ display: "flex", justifyContent: "center", gap: 2 }));
