import "@tanstack/react-table";

declare module "*.css";

declare module "@tanstack/table-core" {
  interface ColumnMeta<TData extends RowData, TValue> {
    minWidth?: number;
    widthFractions?: number;
  }
}
