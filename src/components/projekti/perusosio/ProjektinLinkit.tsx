import React from "react";
import { PerusosioProps } from "./Perusosio";
import { ExternalStyledLink } from "@components/StyledLink";
import ContentSpacer from "@components/layout/ContentSpacer";

export default function ProjektinLinkit({ projekti }: PerusosioProps) {
  const velhoURL = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + projekti.oid;
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
