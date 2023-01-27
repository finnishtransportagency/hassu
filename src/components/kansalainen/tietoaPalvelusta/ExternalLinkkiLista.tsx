import { ExternalStyledLink } from "@components/StyledLink";
import { styled } from "@mui/material";
import React from "react";

interface LinkkiTiedot {
  href: string;
  teksti: string;
}

export default styled(
  ({
    linkkiTiedot,
    ...props
  }: React.DetailedHTMLProps<React.HTMLAttributes<HTMLUListElement>, HTMLUListElement> & { linkkiTiedot: LinkkiTiedot[] }) => (
    <ul {...props}>
      {linkkiTiedot.map(({ href, teksti }) => (
        <li key={teksti}>
          <ExternalStyledLink href={href}>{teksti}</ExternalStyledLink>
        </li>
      ))}
    </ul>
  )
)({ listStyleType: "disc", listStylePosition: "inside" });
