import IconButton from "@components/button/IconButton";
import { HyvaksymisEsitysForm } from "@components/HyvaksymisEsitys/hyvaksymisEsitysFormUtil";
import { MUIStyledCommonProps, styled, experimental_sx as sx } from "@mui/system";
import { ComponentProps } from "react";
import { FieldArrayWithId, UseFieldArrayRemove, UseFieldArrayReturn } from "react-hook-form";
import useTableDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import { FormAineistoNew } from "../util";

type ActionColumnProps = {
  aineisto: FormAineistoNew;
  fields: FieldArrayWithId<HyvaksymisEsitysForm, `muokattavaHyvaksymisEsitys.suunnitelma.${string}`, "id">[];
  index: number;
  remove: UseFieldArrayRemove;
  updateFieldArray: UseFieldArrayReturn<HyvaksymisEsitysForm, `muokattavaHyvaksymisEsitys.suunnitelma.${string}`>["update"];
} & MUIStyledCommonProps &
  ComponentProps<"div">;

export const ActionsColumn = styled(({ index, remove, updateFieldArray, fields, aineisto, ...props }: ActionColumnProps) => {
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
      <IconButton type="button" icon="equals" ref={dragRef} />
    </div>
  );
})(sx({ display: "flex", justifyContent: "center", gap: 2 }));
