import { Table } from "@tanstack/react-table";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef } from "react";
import { BodyContent } from "./HassuTable";

export type BodyContentVirtualWindowProps<T> = {
  table: Table<T>;
  gridTemplateColumns: string;
};

export default function BodyContentVirtualWindow<T>(props: BodyContentVirtualWindowProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);
  useLayoutEffect(() => {
    parentOffsetRef.current = (parentRef.current?.getBoundingClientRect?.()?.top ?? 0) + (window?.scrollY ?? 0);
  });
  const virtualizer = useWindowVirtualizer({
    count: props.table.getRowModel().rows.length,
    estimateSize: () => 106,
    scrollMargin: parentOffsetRef.current,
  });

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <BodyContent
      gridTemplateColumns={props.gridTemplateColumns}
      table={props.table}
      parentRef={parentRef}
      type="window"
      virtualizer={virtualizer}
      bodySx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${(virtualRows?.[0]?.start ?? 0) - (virtualizer.options.scrollMargin ?? 0)}px)`,
      }}
      tableSx={{
        height: virtualizer.getTotalSize(),
      }}
    />
  );
}
