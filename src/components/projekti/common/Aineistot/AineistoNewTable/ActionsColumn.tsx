import IconButton from "@components/button/IconButton";
import { MUIStyledCommonProps, styled, experimental_sx as sx } from "@mui/system";
import { ComponentProps } from "react";
import { UseFieldArrayRemove } from "react-hook-form";
import useTableDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";

type ActionColumnProps = {
  index: number;
  remove: UseFieldArrayRemove;
} & MUIStyledCommonProps &
  ComponentProps<"div">;

export const ActionsColumn = styled(({ index, remove, ...props }: ActionColumnProps) => {
  const dragRef = useTableDragConnectSourceContext();
  return (
    <div {...props}>
      <IconButton
        type="button"
        onClick={() => {
          remove(index);
        }}
        icon="trash"
      />
      <IconButton
        type="button"
        icon="equals"
        ref={(node) => {
          if (node && dragRef) dragRef(node);
        }}
      />
    </div>
  );
})(sx({ display: "flex", justifyContent: "center", gap: 2 }));
