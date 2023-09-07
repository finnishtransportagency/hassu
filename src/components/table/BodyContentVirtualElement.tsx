import { Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef } from "react";
import { BodyContent } from "./HassuTable";

export type BodyContentVirtualElementProps<T> = {
  table: Table<T>;
  gridTemplateColumns: string;
  getScrollElement: () => Element | null;
};

export default function BodyContentVirtualElement<T>(props: BodyContentVirtualElementProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useLayoutEffect(() => {
    parentOffsetRef.current = (parentRef.current?.getBoundingClientRect?.()?.top ?? 0) + (props.getScrollElement()?.scrollTop ?? 0);
  });

  const virtualizer = useVirtualizer({
    count: props.table.getRowModel().rows.length,
    estimateSize: () => 106,
    getScrollElement: props.getScrollElement,
    scrollMargin: parentOffsetRef.current,
  });

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <BodyContent
      gridTemplateColumns={props.gridTemplateColumns}
      table={props.table}
      bodySx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${(virtualRows?.[0]?.start ?? 0) - (virtualizer?.options?.scrollMargin ?? 0)}px)`,
      }}
      tableSx={{
        height: virtualizer.getTotalSize(),
      }}
      type="scrollElement"
      parentRef={parentRef}
      virtualizer={virtualizer}
    />
  );
}
