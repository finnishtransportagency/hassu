import "@tanstack/react-table";

declare module "*.css";

declare module "@tanstack/table-core" {
  interface ColumnMeta<TData extends RowData, TValue> {
    minWidth?: number;
    widthFractions?: number;
  }

  export interface Row<TData extends RowData>
    extends CoreRow<TData>,
      VisibilityRow<TData>,
      ColumnPinningRow<TData>,
      FiltersRow<TData>,
      GroupingRow,
      RowSelectionRow,
      ExpandedRow {}

  interface TableMeta<TData extends RowData> {
    tableId?: string;
    onDragAndDrop?: (id: string, targetRowIndex: number) => void;
    findRowIndex?: (id: string) => number;
    rowOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>, row: Row<TData>) => void;
    rowHref?: (row: Row<TData>) => string;
  }
}
