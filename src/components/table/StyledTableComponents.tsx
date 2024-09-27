import { styled, experimental_sx as sx } from "@mui/system";
import { focusStyle } from "../layout/HassuMuiThemeProvider";

export const TableWrapper = styled("div")(
  sx({
    overflowX: "auto",
  })
);

export const StyledTable = styled("div")(
  sx({
    width: "fit-content",
    minWidth: "100%",
    overflowWrap: "anywhere",
    hyphens: "auto",
  })
);

export const Thead = styled("div")(sx({ fontWeight: 700, color: "#7A7A7A", paddingBottom: { md: 2 }, textAlign: "left" }));
export const Cell = styled("div")(sx({}));
export const HeaderCell = styled(Cell)(({ onClick }) =>
  sx({
    cursor: onClick ? "pointer" : undefined,
  })
);
export const DataCell = styled(Cell)(sx({ alignContent: "center" }));
export const DataCellContent = styled("div")(sx({}));
export const DataCellHeaderContent = styled(DataCellContent)({ fontWeight: 700 });
export const HeaderCellContents = styled("div")(sx({}));

export const Tbody = styled("div")(sx({}));
export const TbodyWrapper = styled("div")(
  sx({
    width: "100%",
    position: "relative",
  })
);
export const Tr = styled("div")(
  sx({
    display: { xs: "flex", md: "grid" },
    flexDirection: { xs: "column", md: null },
    paddingLeft: 4,
    paddingRight: 4,
    rowGap: 2,
    columnGap: 4,
  })
);

export const BodyTrWrapper = styled("div")(
  sx({
    display: "block",
    paddingTop: { xs: 4, md: 7.5 },
    paddingBottom: { xs: 4, md: 7.5 },
    position: "relative",
    "&:focus-visible": focusStyle,
  })
);
export const BodyTr = styled(Tr)(sx({}));
