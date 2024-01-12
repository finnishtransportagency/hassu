import React from "react";
import { Dialog, DialogProps, styled } from "@mui/material";
import { StyledMap2 } from "@components/projekti/common/StyledMap2";

export default function Kiinteistonomistajat() {
  return typeof window !== "undefined" && <Tialogi open></Tialogi>;
}

const Tialogi = styled(({ children, ...props }: DialogProps) => {
  return (
    <Dialog fullScreen {...props}>
      <StyledMap2>{children}</StyledMap2>
    </Dialog>
  );
})({});
