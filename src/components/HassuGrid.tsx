import { ComponentProps, ReactNode } from "react";
import { styled, experimental_sx as sx, Breakpoint } from "@mui/material";
import isPropValid from "@emotion/is-prop-valid";

type Props = {
  children?: ReactNode;
  cols?: ResponsiveValues<number>;
} & ComponentProps<"div">;

export type ResponsiveValues<T extends string | number> =
  | {
      [key in Breakpoint]?: T | undefined | null;
    }
  | (T | undefined | null)[]
  | T;

const resolveGridTemplateColumns = (col: Props["cols"]) => {
  if (typeof col === "number") {
    return `repeat(${col}, minmax(0, 1fr))`;
  } else if (Array.isArray(col)) {
    return col.map((col) => `repeat(${col}, minmax(0, 1fr))`);
  } else if (typeof col === "object") {
    return Object.entries(col).reduce((result, [key, value]) => {
      (result as any)[key] = `repeat(${value}, minmax(0, 1fr))`;
      return result;
    }, {});
  }
  return undefined;
};

export const Grid = styled(({ cols: _cols, children, ...props }: Props) => <div {...props}>{children}</div>, {
  shouldForwardProp: isPropValid,
})((props: Props) => {
  return sx({
    display: "grid",
    columnGap: 7.5,
    rowGap: 4,
    gridTemplateColumns: resolveGridTemplateColumns(props.cols),
  });
});

export default Grid;
