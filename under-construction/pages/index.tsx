import React from "react";
import { experimental_sx as sx, styled } from "@mui/material";
import StyledLink from "../../src/components/StyledLink";
import ContentSpacer from "../../src/components/layout/ContentSpacer";
import InfoCardPageLayout from "../../src/components/layout/InfoCardPageLayout";

export default function RakenteillaSivu() {
  return (
    <InfoCardPageLayout>
      <ContentSpacer gap={12}>
        <ContentSpacer gap={7}>
          <h1 className="text-primary-dark">Valtion liikenneväylien suunnittelu</h1>
          <p className="vayla-subtitle">Valtion liikenneväylien suunnittelu -palvelu avautuu 1.3.2023</p>
          <p>
            Valtion liikenneväylien suunnittelu on kansalaisten, sidosryhmien ja viranomaisten välinen maanteiden ja rautateiden
            lakisääteisten suunnitelmien vuorovaikutuskanava.
          </p>
        </ContentSpacer>
        <KuvaContainer className="justify-center">
          <Img src="vayla_alla_fi_sv_rgb.png" alt="Väylävirasto logo" sx={{ maxHeight: "117px" }} />
          <Img src="ely_alla_fi_sv_rgb.png" alt="ELY logo" sx={{ maxHeight: "91px" }} />
        </KuvaContainer>
        <StyledLink href="/yllapito/kirjaudu" useNextLink={false} sx={{ fontWeight: 400, display: "inline-block" }}>
          Kirjaudu ylläpitoon
        </StyledLink>
      </ContentSpacer>
    </InfoCardPageLayout>
  );
}

const Img = styled("img")({});

const KuvaContainer = styled("div")(
  sx({
    display: "flex",
    gap: 2,
    flexWrap: "wrap",
    alignItems: "center",
  })
);
