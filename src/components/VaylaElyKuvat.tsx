// Contains code generated or recommended by Amazon Q
import React from "react";
import { experimental_sx as sx, styled } from "@mui/material";

export default function VaylaElyKuvat() {
  return (
    <KuvaContainer>
      <Img src="/assets/vayla_alla_fi_sv_rgb.png" alt="Väylävirasto logo" sx={{ maxHeight: "117px" }} />
      <Img src="/assets/evk_footer_fi_sv.png" alt="Elinvoimakeskus logo" sx={{ maxHeight: "91px" }} />
    </KuvaContainer>
  );
}

const Img = styled("img")({});

const KuvaContainer = styled("div")(
  sx({
    display: "flex",
    justifyContent: "center",
    gap: 2,
    flexWrap: "wrap",
    alignItems: "center",
  })
);
