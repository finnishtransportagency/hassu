import { H2 } from "@components/Headings";
import StyledLink from "@components/StyledLink";
import { styled } from "@mui/material";
import React, { ReactElement } from "react";

export default function Ohjeet(): ReactElement {
  const ohjevideot = [
    {
      nimi: "Karttarajauksen piirtäminen",
      kesto: "39 s",
      href: "https://extranet.vayla.fi/share/page/site/hallinnollisen-ksittelyn-malliasiakirjat/document-details?nodeRef=workspace://SpacesStore/48c37954-915e-46a0-be39-eaf5ab573438",
    },
    {
      nimi: "Karttarajauksen tiedostolla tuominen",
      kesto: "39 s",
      href: "https://extranet.vayla.fi/share/page/site/hallinnollisen-ksittelyn-malliasiakirjat/document-details?nodeRef=workspace://SpacesStore/82f7c9a0-4e29-48f5-baf5-41e99bf19cd3",
    },
    {
      nimi: "Karttarajauksen muokkaaminen",
      kesto: "37 s",
      href: "https://extranet.vayla.fi/share/page/site/hallinnollisen-ksittelyn-malliasiakirjat/document-details?nodeRef=workspace://SpacesStore/d75f6203-f9ba-4048-9747-7ca725492d5e",
    },
    {
      nimi: "Karttarajauksen lisääminen",
      kesto: "37 s",
      href: "https://extranet.vayla.fi/share/page/site/hallinnollisen-ksittelyn-malliasiakirjat/document-details?nodeRef=workspace://SpacesStore/affa4eb1-2aa1-468d-ae2e-8eb8ffad434c",
    },
    {
      nimi: "Karttarajauksen poistaminen",
      kesto: "40 s",
      href: "https://extranet.vayla.fi/share/page/site/hallinnollisen-ksittelyn-malliasiakirjat/document-details?nodeRef=workspace://SpacesStore/13a8b2e0-7cb4-49f3-8564-e2d07e2bfaa6",
    },
  ];

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
      <H2 sx={{ mt: 8 }}>Ohjevideot</H2>
      <LinkkiLista>
        {ohjevideot.map(({ nimi, kesto, href }) => (
          <li key={nimi}>
            <StyledLink target="_blank" href={href}>
              {nimi}
            </StyledLink>
            <span> ({kesto})</span>
          </li>
        ))}
      </LinkkiLista>
    </section>
  );
}

const LinkkiLista = styled("ol")({
  listStyleType: "disc",
  listStylePosition: "inside",
});
