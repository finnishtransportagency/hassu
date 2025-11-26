import React from "react";
import { experimental_sx as sx, styled } from "@mui/material";
import { isEvkAktivoitu } from "common/util/isEvkAktivoitu";

export default function VaylaElyKuvat() {
  return (
    <KuvaContainer>
      <Img src="/assets/vayla_alla_fi_sv_rgb.png" alt="Väylävirasto logo" sx={{ maxHeight: "117px" }} />
      {isEvkAktivoitu() ? (
        <Img src="/assets/evk_footer_fi_sv.png" alt="Elinvoimakeskus logo" sx={{ maxHeight: "91px" }} />
      ) : (
        <Img src="/assets/ely_alla_fi_sv_rgb.png" alt="ELY logo" sx={{ maxHeight: "91px" }} />
      )}
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
