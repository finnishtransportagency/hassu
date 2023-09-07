import { styled, experimental_sx as sx } from "@mui/material";
import { ComponentProps, ReactNode } from "react";
import isPropValid from "@emotion/is-prop-valid";
import { ResponsiveValues } from "./HassuGrid";

type Props = {
  children?: ReactNode;
  colSpan?: ResponsiveValues<number>;
  colSpanFull?: boolean;
  colStart?: number;
  colEnd?: number;
} & ComponentProps<"div">;

const resolveGridColumn = (colSpan: Props["colSpan"]) => {
  if (typeof colSpan === "number") {
    return `span ${colSpan} / span ${colSpan}`;
  } else if (Array.isArray(colSpan)) {
    return colSpan.map((colSpan) => `span ${colSpan} / span ${colSpan}`);
  } else if (typeof colSpan === "object") {
    return Object.entries(colSpan).reduce((result, [key, value]) => {
      (result as any)[key] = `span ${value} / span ${value}`;
      return result;
    }, {});
  }
  return undefined;
};

export const HassuGridItem = styled(
  ({ children, colSpan: _colSpan, colSpanFull: _colSpanFull, colStart: _colStart, colEnd: _colEnd, ...props }: Props) => (
    <div {...props}>{children}</div>
  ),
  {
    shouldForwardProp: isPropValid,
  }
)((props: Props) => {
  return sx({
    gridColumn: props.colSpanFull ? "1 / -1" : resolveGridColumn(props.colSpan),
    gridColumnStart: props.colStart,
    gridColumnEnd: props.colEnd,
  });
});

export default HassuGridItem;
