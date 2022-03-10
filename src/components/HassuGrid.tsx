import { styled, experimental_sx as sx } from "@mui/material";
import { ReactNode } from "react";
import isPropValid from "@emotion/is-prop-valid";

interface Props {
  children?: ReactNode;
  cols?: number | number[];
}

const resolveGridTemplateColumns = (col: Props["cols"]) => {
  if (typeof col === "number") {
    return `repeat(${col}, minmax(0, 1fr))`;
  } else if (Array.isArray(col)) {
    return col.map((col) => `repeat(${col}, minmax(0, 1fr))`);
  }
  return undefined;
};

export const Grid = styled("div", { shouldForwardProp: isPropValid })((props: Props) => {
  return sx({
    display: "grid",
    columnGap: 7,
    rowGap: 4,
    gridTemplateColumns: resolveGridTemplateColumns(props.cols),
  });
});

export default Grid;
