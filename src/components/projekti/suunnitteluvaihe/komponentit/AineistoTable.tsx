import { ComponentProps, useCallback, useMemo } from "react";
import IconButton from "@components/button/IconButton";
import { UseFieldArrayAppend, UseFieldArrayRemove, UseFieldArrayReturn, useFormContext } from "react-hook-form";
import HassuAineistoNimiExtLink from "../../HassuAineistoNimiExtLink";
import { AineistoTila } from "@services/api";
import Select from "@components/form/Select";
import { formatDateTime } from "common/util/dateUtils";
import find from "lodash/find";
import { SuunnittelunPerustiedotFormValues } from "../Perustiedot";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useTableDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import { MUIStyledCommonProps, styled, experimental_sx as sx } from "@mui/system";
import HassuTable from "../../../table/HassuTable";
import { useIsTouchScreen } from "src/hooks/useIsTouchScreen";
import { FormAineisto } from "src/util/FormAineisto";

export enum SuunnitteluVaiheAineistoTyyppi {
  ESITTELYAINEISTOT = "ESITTELYAINEISTOT",
  SUUNNITELMALUONNOKSET = "SUUNNITELMALUONNOKSET",
}

interface AineistoTableProps {
  aineistoTyyppi: SuunnitteluVaiheAineistoTyyppi;
  esittelyaineistotFieldArray: UseFieldArrayReturn<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.esittelyaineistot", "id">;
  poistetutEsittelyaineistotFieldArray: UseFieldArrayReturn<
    SuunnittelunPerustiedotFormValues,
    "vuorovaikutusKierros.poistetutEsittelyaineistot",
    "id"
  >;
  suunnittelmaluonnoksetFieldArray: UseFieldArrayReturn<
    SuunnittelunPerustiedotFormValues,
    "vuorovaikutusKierros.suunnitelmaluonnokset",
    "id"
  >;
  poistetutSuunnittelmaluonnoksetFieldArray: UseFieldArrayReturn<
    SuunnittelunPerustiedotFormValues,
    "vuorovaikutusKierros.poistetutSuunnitelmaluonnokset",
    "id"
  >;
}

const AineistoTable = ({
  aineistoTyyppi,
  esittelyaineistotFieldArray: esittelyAineistotFieldArray,
  poistetutEsittelyaineistotFieldArray: poistetutEsittelyAineistotFieldArray,
  poistetutSuunnittelmaluonnoksetFieldArray,
  suunnittelmaluonnoksetFieldArray,
}: AineistoTableProps) => {
  const { watch, setValue } = useFormContext<SuunnittelunPerustiedotFormValues>();

  const {
    fields,
    remove,
    move,
    update: updateFieldArray,
  } = aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT ? esittelyAineistotFieldArray : suunnittelmaluonnoksetFieldArray;
  const { append: appendToPoistetut } =
    aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT
      ? poistetutEsittelyAineistotFieldArray
      : poistetutSuunnittelmaluonnoksetFieldArray;
  const { append: appendToOtherArray } =
    aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT ? suunnittelmaluonnoksetFieldArray : esittelyAineistotFieldArray;

  const fieldArrayName =
    aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT
      ? "vuorovaikutusKierros.esittelyaineistot"
      : "vuorovaikutusKierros.suunnitelmaluonnokset";

  const otherFieldArrayName =
    aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT
      ? "vuorovaikutusKierros.suunnitelmaluonnokset"
      : "vuorovaikutusKierros.esittelyaineistot";

  const otherAineistoWatch = watch(otherFieldArrayName);

  const columns = useMemo<ColumnDef<FormAineisto & { id: string }>[]>(
    () => [
      {
        header: "Aineisto",
        meta: {
          minWidth: 250,
          widthFractions: 3,
        },
        id: "aineisto",
        accessorFn: (aineisto) => <HassuAineistoNimiExtLink aineistoNimi={aineisto.nimi} tiedostoPolku={aineisto.tiedosto} />,
      },
      {
        header: "Tuotu",
        id: "tuotu",
        accessorFn: (aineisto) => {
          if (aineisto.tila === AineistoTila.ODOTTAA_TUONTIA) {
            return "Ladataan...";
          }
          return aineisto.tila === AineistoTila.VALMIS && aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined;
        },
        meta: { widthFractions: 2 },
      },
      {
        header: "Kategoria",
        id: "kategoria",
        accessorFn: (aineisto, index) => (
          <Select
            defaultValue={aineistoTyyppi}
            onChange={(event) => {
              const tyyppi = event.target.value as SuunnitteluVaiheAineistoTyyppi;
              if (tyyppi !== aineistoTyyppi) {
                if (!find(otherAineistoWatch, { uuid: aineisto.uuid })) {
                  appendToOtherArray({
                    dokumenttiOid: aineisto.dokumenttiOid,
                    nimi: aineisto.nimi,
                    tila: aineisto.tila,
                    jarjestys: otherAineistoWatch?.length,
                    uuid: aineisto.uuid,
                  });
                }
                remove(index);
              }
            }}
            options={[
              { label: "Esittelyaineistot", value: SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT },
              { label: "Suunnitelmaluonnokset", value: SuunnitteluVaiheAineistoTyyppi.SUUNNITELMALUONNOKSET },
            ]}
          />
        ),
        meta: { widthFractions: 2, minWidth: 220 },
      },
      {
        header: "",
        id: "actions",
        accessorFn: (aineisto, index) => (
          <ActionsColumn
            index={index}
            remove={remove}
            aineisto={aineisto}
            updateFieldArray={updateFieldArray}
            appendToPoistetut={appendToPoistetut}
          />
        ),
        meta: { minWidth: 120 },
      },
    ],
    [aineistoTyyppi, otherAineistoWatch, remove, appendToOtherArray, updateFieldArray, appendToPoistetut]
  );

  const findRowIndex = useCallback(
    (id: string) => {
      return fields.findIndex((row) => row.id.toString() === id);
    },
    [fields]
  );

  const onDragAndDrop = useCallback(
    (id: string, targetRowIndex: number) => {
      const index = findRowIndex(id);
      setValue(`${fieldArrayName}.${index}.jarjestys`, targetRowIndex);
      setValue(`${fieldArrayName}.${targetRowIndex}.jarjestys`, index);
      move(index, targetRowIndex);
    },
    [fieldArrayName, findRowIndex, move, setValue]
  );

  const table = useReactTable<FormAineisto & { id: string }>({
    columns,
    data: fields,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    getRowId: (row) => row.id,
    state: { pagination: undefined },
    enableSorting: false,
    meta: { onDragAndDrop, findRowIndex },
  });

  return <HassuTable table={table} />;
};

type ActionColumnProps = {
  aineisto: FormAineisto;
  appendToPoistetut:
    | UseFieldArrayAppend<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.poistetutSuunnitelmaluonnokset">
    | UseFieldArrayAppend<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.poistetutEsittelyaineistot">;
  index: number;
  remove: UseFieldArrayRemove;
  updateFieldArray:
    | UseFieldArrayReturn<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.suunnitelmaluonnokset">["update"]
    | UseFieldArrayReturn<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.esittelyaineistot">["update"];
} & MUIStyledCommonProps &
  ComponentProps<"div">;

const ActionsColumn = styled(({ index, remove, updateFieldArray, aineisto, appendToPoistetut, ...props }: ActionColumnProps) => {
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
      {!isTouch && <IconButton sx={{ touchAction: "none" }} icon="equals" type="button" ref={dragRef} />}
    </div>
  );
})(sx({ display: "flex", justifyContent: "center", gap: 2 }));

export default AineistoTable;
