import React from "react";
import {
  TableOptions,
  PluginHook,
  useTable,
  useFlexLayout,
  useSortBy,
  usePagination,
  CellProps,
  useRowSelect,
} from "react-table";
import { HassuTableProps } from "@components/HassuTable";
import { Stack } from "@mui/material";

export type UseHassuTableProps<D extends object> = Omit<HassuTableProps<D>, "tableInstance"> & {
  tableOptions: TableOptions<D>;
};

export const useHassuTable = <D extends object>(props: UseHassuTableProps<D>): HassuTableProps<D> => {
  const defaultTableOptions: Partial<TableOptions<D>> = {
    defaultColumn: { Cell: ({ value }: CellProps<D>) => value || "-" },
  };

  const { tableOptions, ...tableProps } = props;
  const tableHooks: PluginHook<D>[] = [useFlexLayout];

  if (props.useSortBy) {
    tableHooks.push(useSortBy);
  }

  if (props.usePagination) {
    tableHooks.push(usePagination);
  }

  if (props.useRowSelect) {
    tableHooks.push(useRowSelect);
    tableHooks.push((hooks) => {
      hooks.visibleColumns.push((columns) => [
        // Let's make a column for selection
        ...columns,
        {
          id: "selection",
          Header: function SelectHeader(header) {
            return (
              <Stack alignItems="center" rowGap="0">
                <span>Valitse</span>
                <span>
                  {"( "}
                  <IndeterminateCheckbox {...header.getToggleAllRowsSelectedProps()} />
                  {" )"}
                </span>
              </Stack>
            );
          },
          Cell: function SelectCell(cell: React.PropsWithChildren<CellProps<D>>) {
            return (
              <Stack alignItems="center" rowGap="0">
                <span>
                  <IndeterminateCheckbox {...cell.row.getToggleRowSelectedProps()} />
                </span>
              </Stack>
            );
          },
          minWidth: 100,
          width: 100,
        },
      ]);
    });
  }

  const tableInstance = useTable({ ...defaultTableOptions, ...props.tableOptions }, ...tableHooks);

  return {
    tableInstance,
    ...tableProps,
  };
};

const IndeterminateCheckbox = React.forwardRef<HTMLInputElement, { indeterminate?: boolean }>(
  ({ indeterminate, ...rest }, ref) => {
    const defaultRef = React.useRef(null);
    const resolvedRef = ref || defaultRef;

    React.useEffect(() => {
      (resolvedRef as any).current.indeterminate = indeterminate;
    }, [resolvedRef, indeterminate]);

    return <input type="checkbox" ref={resolvedRef} {...rest} />;
  }
);
IndeterminateCheckbox.displayName = "IndeterminateCheckbox";
