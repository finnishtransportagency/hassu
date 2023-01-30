import StyledLink from "@components/StyledLink";
import { styled } from "@mui/material";
import React, { ReactElement } from "react";

export default function Ohjeet(): ReactElement {
  return (
    <section>
      <h1>Ohjeet</h1>
      <LinkkiLista>
        <li>
          <StyledLink
            download
            href="https://extranet.vayla.fi/share/proxy/alfresco/slingshot/node/content/workspace/SpacesStore/67100eff-61f7-41bf-88e9-1e1d02a4b0b7/Valtion%20liikennev%c3%a4ylien%20suunnittelu%20K%c3%84YTT%c3%96OHJE.pptx?a=true"
          >
            Valtion liikenneväylien suunnittelu KÄYTTÖOHJE.pptx
          </StyledLink>
        </li>
      </LinkkiLista>
    </section>
  );
}

const LinkkiLista = styled("ol")({
  listStyleType: "disc",
  listStylePosition: "inside",
});
