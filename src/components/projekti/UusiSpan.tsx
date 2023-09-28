import { experimental_sx as sx, styled } from "@mui/system";
import React from "react";

const StyledSpan = styled("span")(({ theme }) =>
  sx({ color: theme.palette.primary.dark, fontWeight: "bold", textTransform: "uppercase", whiteSpace: "nowrap" })
);

type Props = Omit<React.ComponentProps<typeof StyledSpan>, "children">;

export const UusiSpan = (props: Props) => <StyledSpan {...props}>Uusi</StyledSpan>;
