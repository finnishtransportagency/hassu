import { ExternalStyledLink } from "@components/StyledLink";
import { styled, experimental_sx as sx } from "@mui/material";
import React from "react";

interface LinkkiTiedot {
  href: string;
  teksti: string;
  prependText?: string;
}

export default styled(
  ({
    linkkiTiedot,
    ...props
  }: React.DetailedHTMLProps<React.HTMLAttributes<HTMLUListElement>, HTMLUListElement> & { linkkiTiedot: LinkkiTiedot[] }) => (
    <ul {...props}>
      {linkkiTiedot.map(({ href, teksti, prependText }) => (
        <li key={teksti}>
          <ExternalStyledLink href={href}>{teksti}</ExternalStyledLink>
          {prependText && <PrependText>{prependText}</PrependText>}
        </li>
      ))}
    </ul>
  )
)({ listStyleType: "disc", listStylePosition: "inside" });

const PrependText = styled("span")(sx({ marginLeft: 3 }));
