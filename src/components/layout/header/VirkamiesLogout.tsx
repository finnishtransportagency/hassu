import ButtonLink from "@components/button/ButtonLink";
import StyledLink from "@components/StyledLink";
import { getPublicEnv } from "src/util/env";

export default function VirkamiesLogout({ mobile }: { mobile?: true }) {
  const logoutHref = getPublicEnv("VAYLA_EXTRANET_URL");

  if (mobile) {
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
