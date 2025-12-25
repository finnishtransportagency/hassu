import HassuTable from "@components/table/HassuTable";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useTranslation from "next-translate/useTranslation";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useCallback, useMemo } from "react";
import { AineistoKategoriat, kategorisoimattomatId } from "common/aineistoKategoriat";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import { ActionsColumn } from ".";
import { FormAineistoNew, getAllOptionsForKategoriat } from "../util";
import { EnnakkoneuvotteluForm, HyvaksymisEsitysForm } from "@components/HyvaksymisEsitys/hyvaksymisEsitysFormUtil";
import { formatDateTime } from "common/util/dateUtils";
import HassuMuiSelect from "@components/form/HassuMuiSelect";
import { MenuItem } from "@mui/material";

interface AineistoTableProps {
  kategoriaId: string;
  aineistoKategoriat: AineistoKategoriat;
  ennakkoneuvottelu?: boolean;
}

export function AineistoLinkitettyProjektiTable(props: Readonly<AineistoTableProps>) {
  const { control, register, getValues, setValue } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const aineistoRouteEsitys: `muokattavaHyvaksymisEsitys.linkitetynProjektinAineisto.${string}` = `muokattavaHyvaksymisEsitys.linkitetynProjektinAineisto.${props.kategoriaId}`;
  const aineistoRouteEnnakko: `ennakkoNeuvottelu.linkitetynProjektinAineisto.${string}` = `ennakkoNeuvottelu.linkitetynProjektinAineisto.${props.kategoriaId}`;
  const aineistoRoute = props.ennakkoneuvottelu ? aineistoRouteEnnakko : aineistoRouteEsitys;
  const { fields, remove, move } = useFieldArray({ name: aineistoRoute, control });

  const { t } = useTranslation("aineisto");

  const allOptions = useMemo(
    () => getAllOptionsForKategoriat({ kategoriat: props.aineistoKategoriat.listKategoriat(), t }),
    [props.aineistoKategoriat, t]
  );

  const columns = useMemo<ColumnDef<FormAineistoNew>[]>(
    () => [
      {
        header: "Aineisto",
        meta: { minWidth: 250, widthFractions: 4 },
        id: "aineisto",
        accessorFn: (aineisto, index) => (
          <>
            <HassuAineistoNimiExtLink
              aineistoNimi={aineisto.nimi}
              tiedostoPolku={aineisto.tiedosto ? "/" + aineisto.tiedosto : undefined}
            />
            <input type="hidden" {...register(`${aineistoRoute}.${index}.dokumenttiOid`)} />
            <input type="hidden" {...register(`${aineistoRoute}.${index}.nimi`)} />
          </>
        ),
      },
      {
        header: "Tuotu",
        id: "tuotu",
        accessorFn: (aineisto) => {
          // Jos on jo tallennettu aineisto, jolla ei tuotu-aikaleimaa, näytetään Ladataan-tekstiä
          if (!aineisto.newlyAdded && !aineisto.tuotu) {
            return "Ladataan...";
          }
          return aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined;
        },
        meta: { minWidth: 120, widthFractions: 2 },
      },
      {
        header: "Kategoria",
        id: "kategoria",
        accessorFn: (aineisto, index) => (
          <HassuMuiSelect
            name={`${aineistoRoute}.${index}.kategoriaId`}
            control={control}
            noEmptyOption
            defaultValue={aineisto.kategoriaId ?? kategorisoimattomatId}
            onChange={(event) => {
              const newKategoria = event.target.value;
              if (newKategoria !== props.kategoriaId) {
                const values =
                  getValues(
                    `${
                      props.ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"
                    }.linkitetynProjektinAineisto.${newKategoria}`
                  ) || [];
                setValue(
                  `${
                    props.ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"
                  }.linkitetynProjektinAineisto.${newKategoria}`,
                  [
                    ...values,
                    {
                      ...aineisto,
                      kategoriaId: newKategoria,
                    },
                  ]
                );
                remove(index);
              }
            }}
          >
            {allOptions.map((option) => (
              <MenuItem key={option.label} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </HassuMuiSelect>
        ),
        meta: { minWidth: 120, widthFractions: 2 },
      },
      {
        header: "",
        id: "actions",
        accessorFn: (_aineisto, index) => <ActionsColumn index={index} remove={remove} />,
        meta: { minWidth: 120, widthFractions: 2 },
      },
    ],
    [register, aineistoRoute, control, allOptions, props.kategoriaId, getValues, setValue, remove]
  );

  const findRowIndex = useCallback((id: string) => fields.findIndex((row) => row.uuid.toString() === id), [fields]);

  const onDragAndDrop = useCallback(
    (id: string, targetRowIndex: number) => {
      move(findRowIndex(id), targetRowIndex);
    },
    [findRowIndex, move]
  );

  const table = useReactTable({
    columns,
    data: fields || [],
    getCoreRowModel: getCoreRowModel(),
    state: {
      pagination: undefined,
    },
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    getRowId: (row) => row.uuid,
    meta: { tableId: `${props.kategoriaId}_table`, findRowIndex, onDragAndDrop },
  });

  return <HassuTable table={table} />;
}
