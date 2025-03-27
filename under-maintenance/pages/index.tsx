import React, { useEffect } from "react";
import { experimental_sx as sx, styled } from "@mui/material";
import { ExternalStyledLink } from "../../src/components/StyledLink";
import ContentSpacer from "../../src/components/layout/ContentSpacer";
import InfoCardPageLayout from "../../src/components/layout/InfoCardPageLayout";

export default function RakenteillaSivu() {
  useEffect(() => {
    const script = document.createElement("script");

    script.src = "pollFrontPage.js";
    script.async = true;

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);
  return (
    <InfoCardPageLayout>
      <ContentSpacer gap={12}>
        <ContentSpacer gap={7}>
          <h1 className="text-primary-dark">Valtion liikenneväylien suunnittelu</h1>
          <h1 className="text-primary-dark" style={{ fontWeight: 400 }}>
            Planering av statens trafikleder
          </h1>
          <br></br>
          <p className="vayla-subtitle">Palvelussa on huoltokatko</p>
          <p>Huoltokatkon vuoksi palvelu on tilapäisesti poissa käytöstä noin 30 minuutin ajan. Pahoittelemme tästä aiheutuvaa häiriötä.</p>
          <p className="vayla-lead">Serviceavbrott i tjänsten</p>
          <p>
            På grund av serviceavbrottet är tjänsten tillfälligt ur bruk i cirka 30 minuter. Vi beklagar de olägenheter som avbrottet
            orsakar.
          </p>
        </ContentSpacer>
        <KuvaContainer className="justify-center">
          <Img src="vayla_alla_fi_sv_rgb.png" alt="Väylävirasto logo" sx={{ maxHeight: "117px" }} />
          <Img src="ely_alla_fi_sv_rgb.png" alt="ELY logo" sx={{ maxHeight: "91px" }} />
        </KuvaContainer>
        <ExternalStyledLink href="https://vayla.fi" sx={{ fontWeight: 400, display: "inline-block" }}>
          Väylä.fi
        </ExternalStyledLink>
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
