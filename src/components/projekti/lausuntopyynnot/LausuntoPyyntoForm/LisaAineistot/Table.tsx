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
import { FormLadattuTiedosto, LausuntoPyynnotFormValues } from "../../types";
import HassuLadattuTiedostoNimiExtLink from "@components/projekti/HassuLadattuTiedostoNimiExtLink";

export default function AineistoTable({
  lausuntoPyyntoIndex,
  joTallennetutLisaAineistot,
}: {
  lausuntoPyyntoIndex: number;
  joTallennetutLisaAineistot: LadattuTiedosto[];
}) {
  const { control, formState, register, setValue } = useFormContext<LausuntoPyynnotFormValues>();
  const { fields, move, remove } = useFieldArray({ name: `lausuntoPyynnot.${lausuntoPyyntoIndex}.lisaAineistot`, control });
  const { append: appendToPoistetut } = useFieldArray({ name: `lausuntoPyynnot.${lausuntoPyyntoIndex}.poistetutLisaAineistot`, control });

  const enrichedFields: FormLadattuTiedosto[] = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = joTallennetutLisaAineistot || [];
        const { tuotu } = aineistoData.find(({ nimi, tila }) => nimi === field.nimi && field.tila == tila) || {};

        return { tuotu, ...field };
      }),
    [fields, joTallennetutLisaAineistot]
  );

  const columns = useMemo<ColumnDef<FormLadattuTiedosto>[]>(
    () => [
      {
        header: "Tiedosto",
        meta: { minWidth: 250, widthFractions: 6 },
        accessorFn: (aineisto) => {
          const aineistoIndex = enrichedFields.findIndex((row) => row.nimi === aineisto.nimi);
          const errorMessage = (formState.errors.lausuntoPyynnot?.[lausuntoPyyntoIndex].lisaAineistot?.[aineistoIndex] as any | undefined)
            ?.message;
          return (
            <>
              <HassuLadattuTiedostoNimiExtLink
                tiedostoNimi={aineisto.nimi}
                tiedostoPolku={aineisto.tiedosto}
                tiedostoTila={aineisto.tila}
              />
              {errorMessage && <p className="text-red">{errorMessage}</p>}
              <input type="hidden" {...register(`lausuntoPyynnot.${lausuntoPyyntoIndex}.lisaAineistot.${aineistoIndex}.tiedosto`)} />
              <input type="hidden" {...register(`lausuntoPyynnot.${lausuntoPyyntoIndex}.lisaAineistot.${aineistoIndex}.nimi`)} />
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
          const index = enrichedFields.findIndex((row) => row.tiedosto === aineisto.tiedosto);
          return <ActionsColumn index={index} remove={remove} aineisto={aineisto} appendToPoistetut={appendToPoistetut} />;
        },
      },
    ],
    [enrichedFields, formState.errors.lausuntoPyynnot, lausuntoPyyntoIndex, register, remove, appendToPoistetut]
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
      setValue(`lausuntoPyynnot.${lausuntoPyyntoIndex}.lisaAineistot.${aineistoIndex}.jarjestys`, targetRowIndex);
      setValue(`lausuntoPyynnot.${lausuntoPyyntoIndex}.lisaAineistot.${targetRowIndex}.jarjestys`, aineistoIndex);
      move(aineistoIndex, targetRowIndex);
    },
    [findRowIndex, move, setValue, lausuntoPyyntoIndex]
  );

  const tableProps = useReactTable<FormLadattuTiedosto>({
    columns,
    data: enrichedFields || [],
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
  appendToPoistetut: UseFieldArrayAppend<LausuntoPyynnotFormValues, `lausuntoPyynnot.${number}.poistetutLisaAineistot`>;
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
