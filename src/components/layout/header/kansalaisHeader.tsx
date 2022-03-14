import { Container } from "@mui/material";
import React, { ReactElement } from "react";
import { HeaderProps } from "./header";

export function KansalaisHeader({}: HeaderProps): ReactElement {
  return (
    <Container>
      <div className="bg-gray-light py-4 pl-4">KANSALAISHEADER - TBD</div>
    </Container>
  );
}

export default KansalaisHeader;
