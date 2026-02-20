import React from "react";
import { styled } from "@mui/material";
import { ExternalStyledLink } from "./StyledLink";
import ContentSpacer from "./layout/ContentSpacer";
import InfoCardPageLayout from "@components/layout/InfoCardPageLayout";
import VaylaElyKuvat from "@components/VaylaElyKuvat";
import { getPublicEnv } from "src/util/env";
const tukiEmail = "tuki.vayliensuunnittelu@vayla.fi";

const EmailLink = styled("a")({ fontWeight: 700 });

export const TukiEmailLink = () => <EmailLink href={`mailto:${tukiEmail}`}>{tukiEmail}</EmailLink>;

export default function EiOikeuksiaSivu() {
  const logoutHref = getPublicEnv("VAYLA_EXTRANET_URL");
  return (
    <InfoCardPageLayout>
      <ContentSpacer gap={12}>
        <ContentSpacer gap={7}>
          <h1 className="text-primary-dark">Valtion liikenneväylien suunnittelu</h1>
          <p className="vayla-subtitle">Sinulta puuttuu käyttöoikeudet järjestelmään</p>
          <p>
            Et pääse tarkastelemaan Valtion liikenneväylien suunnittelu -järjestelmän tietoja, sillä sinulta puuttuu oikeudet järjestelmään.
            Jos tarvitset oikeudet järjestelmään, ota yhteys sähköpostitse <EmailLink href={`mailto:${tukiEmail}`}>{tukiEmail}</EmailLink>.
          </p>
        </ContentSpacer>
        <VaylaElyKuvat />
        <ContentSpacer gap={4}>
          {logoutHref && (
            <ExternalStyledLink href={logoutHref} sx={{ display: "block" }}>
              Väyläviraston Extranet
            </ExternalStyledLink>
          )}
          <ExternalStyledLink href="/" sx={{ display: "block" }}>
            Valtion liikenneväylien suunnittelun julkinen puoli
          </ExternalStyledLink>
        </ContentSpacer>
      </ContentSpacer>
    </InfoCardPageLayout>
  );
}
