import React from "react";
import ButtonLink from "@components/button/ButtonLink";
import StyledLink from "@components/StyledLink";
import { getPublicEnv } from "src/util/env";

interface VirkamiesLogoutProps {
  variant?: "button" | "link";
}

export default function VirkamiesLogout({ variant = "button" }: VirkamiesLogoutProps) {
  const logoutHref = getPublicEnv("VAYLA_EXTRANET_URL");

  if (variant === "link") {
    return (
      <StyledLink sx={{ fontWeight: 400 }} href={logoutHref} useNextLink={false}>
        Poistu Palvelusta
      </StyledLink>
    );
  }

  return (
    <ButtonLink href={logoutHref} useNextLink={false}>
      Poistu Palvelusta
    </ButtonLink>
  );
}
