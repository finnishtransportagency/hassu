import IconButton from "@components/button/IconButton";
import { MUIStyledCommonProps, styled, experimental_sx as sx } from "@mui/system";
import { AineistoTila } from "@services/api";
import { ComponentProps } from "react";
import { FieldArrayWithId, UseFieldArrayAppend, UseFieldArrayRemove, UseFieldArrayReturn } from "react-hook-form";
import useTableDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import { FormAineisto, AineistoNahtavillaTableFormValuesInterface } from "../util";

type ActionColumnProps = {
  aineisto: FormAineisto;
  appendToPoistetut: UseFieldArrayAppend<AineistoNahtavillaTableFormValuesInterface, "poistetutAineistoNahtavilla">;
  fields: FieldArrayWithId<AineistoNahtavillaTableFormValuesInterface, `aineistoNahtavilla.${string}`, "id">[];
  index: number;
  remove: UseFieldArrayRemove;
  updateFieldArray: UseFieldArrayReturn<AineistoNahtavillaTableFormValuesInterface, `aineistoNahtavilla.${string}`>["update"];
} & MUIStyledCommonProps &
  ComponentProps<"div">;

export const ActionsColumn = styled(
  ({ index, remove, updateFieldArray, fields, aineisto, appendToPoistetut, ...props }: ActionColumnProps) => {
    const dragRef = useTableDragConnectSourceContext();
    return (
      <div {...props}>
        <IconButton
          type="button"
          onClick={() => {
            remove(index);
            if (aineisto.tila) {
              appendToPoistetut({
                dokumenttiOid: aineisto.dokumenttiOid,
                tila: AineistoTila.ODOTTAA_POISTOA,
                nimi: aineisto.nimi,
                uuid: aineisto.uuid,
              });
            }
          }}
          icon="trash"
        />
        <IconButton
          type="button"
          icon="equals"
          ref={(el) => {
            dragRef?.(el);
          }}
        />
      </div>
    );
  }
)(sx({ display: "flex", justifyContent: "center", gap: 2 }));
