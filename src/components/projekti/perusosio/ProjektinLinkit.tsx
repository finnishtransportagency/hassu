import React from "react";
import { PerusosioProps } from "./Perusosio";
import { ExternalStyledLink } from "@components/StyledLink";
import ContentSpacer from "@components/layout/ContentSpacer";
import { getVelhoUrl } from "../../../util/velhoUtils";

export default function ProjektinLinkit({ projekti }: PerusosioProps) {
  const velhoURL = getVelhoUrl(projekti.oid);
  return (
    <ContentSpacer>
      {projekti?.velho?.linkki && (
        <p>
          <ExternalStyledLink href={projekti?.velho?.linkki}>Hankesivu</ExternalStyledLink>
        </p>
      )}
      <p>
        <ExternalStyledLink href={velhoURL}>Projektin sivu Projektivelhossa</ExternalStyledLink>
      </p>
    </ContentSpacer>
  );
}
