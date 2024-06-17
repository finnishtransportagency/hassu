import ExtLink from "@components/ExtLink";
import IconButton from "@components/button/IconButton";
import HassuTable from "@components/table/HassuTable";
import { MUIStyledCommonProps, styled } from "@mui/system";
import sx from "@mui/system/sx";
import { ColumnDef, Row, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { formatDateTime } from "common/util/dateUtils";
import { ComponentProps, useCallback, useMemo } from "react";
import { FieldArrayWithId, UseFieldArrayMove, UseFieldArrayRemove, UseFormRegisterReturn } from "react-hook-form";
import useTableDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import { useIsTouchScreen } from "src/hooks/useIsTouchScreen";

type GenTiedosto = {
  uuid: string;
  tiedosto?: string | null;
  lisatty?: string | null;
  tuotu?: boolean | null;
};

type GenTiedostoInput = {
  uuid: string;
  nimi: string;
};

type FormWithTiedostoInputNewArray<T extends GenTiedostoInput> = { [Key: string]: T[] };

type FieldType = FieldArrayWithId<FormWithTiedostoInputNewArray<GenTiedostoInput>, string, "id">;
type RowDataType<S extends GenTiedosto> = FieldType & Pick<S, "lisatty" | "tiedosto" | "tuotu">;

export default function TiedostoInputNewTable<S extends GenTiedosto>({
  id,
  tiedostot,
  fields,
  remove,
  move,
  registerDokumenttiOid,
  registerNimi,
  ladattuTiedosto,
  noHeaders,
  showTuotu,
}: {
  /**
   * Id taulukolle. Oltava uniikki.
   */
  id: string;
  /**
   * Tiedostot DB:ssä DB-muodossa
   */
  tiedostot?: S[] | null;
  /**
   * useFieldArray:stä ulos saadut kentät, jotka vastavat tiedostojen dataa lomakkeella
   */
  fields: FieldType[];
  /**
   * saman useFieldArrayn remove-funktio kuin mistä fields on tullut
   */
  remove: UseFieldArrayRemove;
  /**
   * saman useFieldArrayn move-funktio kuin mistä fields on tullut
   */
  move: UseFieldArrayMove;
  /**
   * Funktio, joka palauttaa funktion, jolla rekisteröidään annetussa indeksissä olevan tiedoston nimi
   * @example (index: number) => register(`muokattavaHyvaksymisEsitys.hyvaksymisEsitys.${index}.nimi`);
   */
  registerNimi: (index: number) => UseFormRegisterReturn;
  /**
   * Anna tämä parametri, jos tiedostotyyppi on Aineisto(New):
   * funktio, joka palauttaa funktion, jolla rekisteröidään annetussa indeksissä olevan tiedoston dokumenttiOid
   * @example (index: number) => register(`muokattavaHyvaksymisEsitys.muuAineistoVelhosta.${index}.dokumenttiOid`);
   */
  registerDokumenttiOid?: (index: number) => UseFormRegisterReturn;
  /**
   * Onko taulun datatyyppi LadattuTiedostoNew
   */
  ladattuTiedosto?: boolean;
  /**
   * Piilotetaanko headerit taulukossa
   */
  noHeaders?: boolean;
  /**
   * Näytetäänkö tuotu-aikaleima-sarake
   */
  showTuotu?: boolean;
}) {
  const enrichedFields: RowDataType<S>[] = useMemo(
    () =>
      fields.map((field) => {
        const tiedostoData = tiedostot || [];
        const { lisatty, tiedosto, tuotu } = tiedostoData.find(({ uuid }) => uuid === field.uuid) || {};

        return { ...field, lisatty, tiedosto, tuotu: tuotu ?? false };
      }),
    [fields, tiedostot]
  );

  const columns = useMemo<ColumnDef<RowDataType<S>>[]>(() => {
    const all = [
      {
        header: noHeaders ? undefined : ladattuTiedosto ? "Tiedostot" : "Aineisto",
        meta: { minWidth: 250, widthFractions: 4 },
        id: "tiedosto",
        accessorFn: (tiedosto: RowDataType<S>) => {
          const index = enrichedFields.findIndex((row) => row.uuid === tiedosto.uuid);
          return (
            <>
              <ExtLink
                className="file_download"
                href={tiedosto.tiedosto ? "/" + tiedosto.tiedosto : undefined}
                target="_blank"
                disabled={!tiedosto.tiedosto}
                hideIcon={!tiedosto.tiedosto}
              >
                {tiedosto.nimi}
              </ExtLink>
              {registerDokumenttiOid && <input type="hidden" {...registerDokumenttiOid(index)} />}
              <input type="hidden" {...registerNimi(index)} />
            </>
          );
        },
      },
      {
        header: noHeaders ? undefined : "Tuotu",
        id: "tuotu",
        accessorFn: (tiedosto: RowDataType<S>) =>
          tiedosto.lisatty && (tiedosto.tuotu || ladattuTiedosto) ? formatDateTime(tiedosto.lisatty) : undefined,
        meta: { minWidth: 120, widthFractions: 2 },
      },
      {
        header: noHeaders ? undefined : "",
        id: "actions",
        accessorFn: (tiedosto: RowDataType<S>) => {
          const index = fields.findIndex((row) => row.uuid === tiedosto.uuid);
          return <ActionsColumn noOrdering={fields.length <= 1} index={index} remove={remove} />;
        },
        meta: { minWidth: 120, widthFractions: 0 },
      },
    ];
    if (showTuotu) {
      return all;
    }
    return all.filter((col) => col.id !== "tuotu");
  }, [enrichedFields, fields, registerDokumenttiOid, registerNimi, remove, ladattuTiedosto, noHeaders, showTuotu]);

  const findRowIndex = useCallback(
    (id: string) => {
      return enrichedFields?.findIndex((row) => row.uuid === id) ?? -1;
    },
    [enrichedFields]
  );

  const onDragAndDrop = useCallback(
    (id: string, targetRowIndex: number) => {
      const index = findRowIndex(id);
      move(index, targetRowIndex);
    },
    [findRowIndex, move]
  );

  const table = useReactTable({
    columns,
    data: enrichedFields || [],
    getCoreRowModel: getCoreRowModel(),
    state: {
      pagination: undefined,
    },
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    getRowId: (row) => row.uuid,
    meta: { tableId: id, findRowIndex, onDragAndDrop, virtualization: { type: "window" } },
  });

  return <HassuTable table={table} />;
}

type ActionColumnProps = {
  index: number;
  remove: UseFieldArrayRemove;
  noOrdering?: boolean;
} & MUIStyledCommonProps &
  ComponentProps<"div">;

export const ActionsColumn = styled(({ index, remove, noOrdering, ...props }: ActionColumnProps) => {
  const dragRef = useTableDragConnectSourceContext();
  const isTouch = useIsTouchScreen();
  return (
    <div {...props}>
      <IconButton
        type="button"
        onClick={() => {
          remove(index);
        }}
        icon="trash"
      />
      {!isTouch && (
        <IconButton
          style={noOrdering ? { visibility: "hidden" } : {}}
          disabled={noOrdering ? true : false}
          type="button"
          icon="equals"
          ref={dragRef}
        />
      )}
    </div>
  );
})(sx({ display: "flex", justifyContent: "center", gap: 2 }));
