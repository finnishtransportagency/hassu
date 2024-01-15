import React from "react";
import { Dialog, DialogProps, styled } from "@mui/material";
import { StyledMap2 } from "@components/projekti/common/StyledMap2";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";

export default function Kiinteistonomistajat() {
  return (
    <ProjektiConsumer>
      {(projekti) => <>({typeof window !== "undefined" && <KarttaDialogi projekti={projekti} open />})</>}
    </ProjektiConsumer>
  );
}

const KarttaDialogi = styled(({ children, projekti, ...props }: DialogProps & { projekti: ProjektiLisatiedolla }) => {
  return (
    <Dialog fullScreen {...props}>
      <StyledMap2 projekti={projekti}>{children}</StyledMap2>
    </Dialog>
  );
})({});
