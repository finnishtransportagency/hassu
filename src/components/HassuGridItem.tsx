import { styled, experimental_sx as sx } from "@mui/material";
import { ReactNode } from "react";
import isPropValid from "@emotion/is-prop-valid";

interface Props {
  children?: ReactNode;
  colSpan?: number | number[];
  colSpanFull?: boolean;
  colStart?: number;
  colEnd?: number;
}

const resolveGridColumn = (colSpan: Props["colSpan"]) => {
  if (typeof colSpan === "number") {
    return `span ${colSpan} / span ${colSpan}`;
  } else if (Array.isArray(colSpan)) {
    return colSpan.map((colSpan) => `span ${colSpan} / span ${colSpan}`);
  }
  return undefined;
};

export const HassuGridItem = styled("div", { shouldForwardProp: isPropValid })((props: Props) => {
  return sx({
    gridColumn: props.colSpanFull ? "1 / -1" : resolveGridColumn(props.colSpan),
    gridColumnStart: props.colStart,
    gridColumnEnd: props.colEnd,
  });
});

export default HassuGridItem;
