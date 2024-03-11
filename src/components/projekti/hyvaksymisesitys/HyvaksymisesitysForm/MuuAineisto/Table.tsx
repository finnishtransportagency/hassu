import IconButton from "@components/button/IconButton";
import HassuTable from "@components/table/HassuTable";
import { LadattuTiedosto, LadattuTiedostoTila } from "@services/api";
import React, { ComponentProps, useCallback, useMemo } from "react";
import { useFieldArray, UseFieldArrayAppend, UseFieldArrayRemove, useFormContext } from "react-hook-form";
import { formatDateTime } from "hassu-common/util/dateUtils";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { experimental_sx as sx, MUIStyledCommonProps, styled } from "@mui/system";
import useTableDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import { useIsTouchScreen } from "src/hooks/useIsTouchScreen";
import { FormLadattuTiedosto, HyvaksymisesitysFormValues } from "../../types";
import HassuLadattuTiedostoNimiExtLink from "@components/projekti/HassuLadattuTiedostoNimiExtLink";

export default function AineistoTable({
  hyvaksymisesitysIndex,
  joTallennetutMuuAineisto,
}: {
  hyvaksymisesitysIndex: number;
  joTallennetutMuuAineisto: LadattuTiedosto[];
}) {
  const { control, formState, register, setValue } = useFormContext<HyvaksymisesitysFormValues>();
  const { fields, move, remove } = useFieldArray({ name: `hyvaksymisesitykset.${hyvaksymisesitysIndex}.muuAineistoLadattu`, control });
  const { append: appendToPoistetut } = useFieldArray({ name: `hyvaksymisesitykset.${hyvaksymisesitysIndex}.poistetutMuuAineistoLadattu`, control });

  const enrichedFields: FormLadattuTiedosto[] = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = joTallennetutMuuAineisto || [];
        const { tuotu } = aineistoData.find(({ uuid }) => uuid === field.uuid) || {};

        return { tuotu, ...field };
      }),
    [fields, joTallennetutMuuAineisto]
  );

  const columns = useMemo<ColumnDef<FormLadattuTiedosto>[]>(
    () => [
      {
        header: "Tiedosto",
        meta: { minWidth: 250, widthFractions: 6 },
        accessorFn: (aineisto) => {
          const aineistoIndex = enrichedFields.findIndex((row) => row.uuid === aineisto.uuid);
          const errorMessage = (formState.errors.hyvaksymisesitykset?.[hyvaksymisesitysIndex].muuAineistoLadattu?.[aineistoIndex] as any | undefined)
            ?.message;
          return (
            <>
              <HassuLadattuTiedostoNimiExtLink
                tiedostoNimi={aineisto.nimi}
                tiedostoPolku={aineisto.tiedosto}
                tiedostoTila={aineisto.tila}
              />
              {errorMessage && <p className="text-red">{errorMessage}</p>}
              <input type="hidden" {...register(`hyvaksymisesitykset.${hyvaksymisesitysIndex}.muuAineistoLadattu.${aineistoIndex}.tiedosto`)} />
              <input type="hidden" {...register(`hyvaksymisesitykset.${hyvaksymisesitysIndex}.muuAineistoLadattu.${aineistoIndex}.nimi`)} />
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
    [enrichedFields, formState.errors.hyvaksymisesitykset, hyvaksymisesitysIndex, register, remove, appendToPoistetut]
  );

  const findRowIndex = useCallback(
    (id: string) => {
      return enrichedFields.findIndex((row) => row.id.toString() === id);
    },
    [enrichedFields]
  );

  const onDragAndDrop = useCallback(
    (id: string, targetRowIndex: number) => {
      const aineistoIndex = findRowIndex(id);
      setValue(`hyvaksymisesitykset.${hyvaksymisesitysIndex}.muuAineistoLadattu.${aineistoIndex}.jarjestys`, targetRowIndex);
      setValue(`hyvaksymisesitykset.${hyvaksymisesitysIndex}.muuAineistoLadattu.${targetRowIndex}.jarjestys`, aineistoIndex);
      move(aineistoIndex, targetRowIndex);
    },
    [findRowIndex, move, setValue, hyvaksymisesitysIndex]
  );

  const tableProps = useReactTable<FormLadattuTiedosto>({
    columns,
    data: fields || [],
    getCoreRowModel: getCoreRowModel(),
    state: {
      pagination: undefined,
    },
    getRowId: (row) => row.id,
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    meta: { findRowIndex, onDragAndDrop, virtualization: { type: "window" } },
  });
  return <HassuTable table={tableProps} />;
}

type ActionColumnProps = {
  aineisto: FormLadattuTiedosto;
  appendToPoistetut: UseFieldArrayAppend<HyvaksymisesitysFormValues, `hyvaksymisesitykset.${number}.poistetutMuuAineistoLadattu`>;
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
              tiedosto: aineisto.tiedosto,
              tila: LadattuTiedostoTila.ODOTTAA_POISTOA,
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
