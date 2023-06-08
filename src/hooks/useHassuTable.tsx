import React, { useMemo } from "react";
import { TableOptions, PluginHook, useTable, useFlexLayout, useSortBy, usePagination, CellProps, useRowSelect } from "react-table";
import { HassuTableProps } from "@components/HassuTable";
import { Stack } from "@mui/material";

export type UseHassuTableProps<D extends object> = Omit<HassuTableProps<D>, "tableInstance"> & {
  tableOptions: TableOptions<D>;
};

export const useHassuTable = <D extends object>(props: UseHassuTableProps<D>): HassuTableProps<D> => {
  const tableOptions: TableOptions<D> = useMemo(() => {
    const defaultTableOptions = {
      defaultColumn: { Cell: ({ value }: CellProps<D>) => value || "-" },
    };
    return { ...defaultTableOptions, ...props.tableOptions };
  }, [props.tableOptions]);

  const tableHooks: PluginHook<D>[] = useMemo(() => {
    const hooks: PluginHook<D>[] = [useFlexLayout];

    if (props.useSortBy) {
      hooks.push(useSortBy);
    }

    if (props.usePagination) {
      hooks.push(usePagination);
    }

    if (props.useRowSelect) {
      hooks.push(useRowSelect);
      hooks.push((hooks) => {
        hooks.visibleColumns.push((columns) => [
          // Let's make a column for selection
          ...columns,
          {
            id: "selection",
            Header: function SelectHeader(_header) {
              return (
                <Stack alignItems="center" rowGap="0">
                  <span>Valitse</span>
                  <span>
                    {"( "}
                    {/* <IndeterminateCheckbox {...header.getToggleAllRowsSelectedProps()} /> */}
                    {" )"}
                  </span>
                </Stack>
              );
            },
            Cell: function SelectCell(_cell: React.PropsWithChildren<CellProps<D>>) {
              return (
                <Stack alignItems="center" rowGap="0">
                  <span>{/* <IndeterminateCheckbox {...cell.row.getToggleRowSelectedProps()} /> */}</span>
                </Stack>
              );
            },
            minWidth: 100,
            width: 100,
          },
        ]);
      });
    }
    return hooks;
  }, [props.usePagination, props.useRowSelect, props.useSortBy]);

  const tableInstance = useTable(tableOptions, ...tableHooks);

  return useMemo(
    () => ({
      tableInstance,
      pageChanger: props.pageChanger,
      rowLink: props.rowLink,
      rowOnClick: props.rowOnClick,
      sortByChanger: props.sortByChanger,
      usePagination: props.usePagination,
      useRowSelect: props.useRowSelect,
      useSortBy: props.useSortBy,
    }),
    [
      props.pageChanger,
      props.rowLink,
      props.rowOnClick,
      props.sortByChanger,
      props.usePagination,
      props.useRowSelect,
      props.useSortBy,
      tableInstance,
    ]
  );
};

const IndeterminateCheckbox = React.forwardRef<HTMLInputElement, { indeterminate?: boolean }>(({ indeterminate, ...rest }, ref) => {
  const defaultRef = React.useRef(null);
  const resolvedRef = ref || defaultRef;

  React.useEffect(() => {
    (resolvedRef as any).current.indeterminate = indeterminate;
  }, [resolvedRef, indeterminate]);

  return <input type="checkbox" ref={resolvedRef} {...rest} />;
});
IndeterminateCheckbox.displayName = "IndeterminateCheckbox";
